(function () {
  var DEFAULT_ENDPOINT = "http://127.0.0.1:8000/recommend";
  var DEFAULT_TIMEOUT_MS = 2200;

  function clean(value) {
    return (value || "").trim();
  }

  function normalize(value) {
    return clean(value).toLowerCase();
  }

  function intersects(left, right) {
    var rightMap = {};
    (right || []).forEach(function (item) {
      rightMap[normalize(item)] = true;
    });
    return (left || []).some(function (item) {
      return !!rightMap[normalize(item)];
    });
  }

  function summarizeHistory(orderHistory) {
    var restaurantCount = {};
    var itemCount = {};

    (orderHistory || []).forEach(function (order) {
      if (order.restaurantId) {
        restaurantCount[order.restaurantId] = (restaurantCount[order.restaurantId] || 0) + 1;
      }
      (order.items || []).forEach(function (item) {
        var key = normalize(item.name);
        if (!key) return;
        itemCount[key] = (itemCount[key] || 0) + Number(item.quantity || 1);
      });
    });

    return {
      restaurantCount: restaurantCount,
      itemCount: itemCount
    };
  }

  function localRecommend(payload) {
    var context = payload.context || {};
    var restaurants = payload.restaurants || [];
    var history = summarizeHistory(payload.orderHistory || []);

    var results = restaurants.map(function (restaurant) {
      var safeMenu = (restaurant.menu || []).filter(function (item) {
        return !intersects(item.allergyTags || [], context.allergies || []);
      });
      var conflicts = (restaurant.menu || []).filter(function (item) {
        return intersects(item.allergyTags || [], context.allergies || []);
      });

      var score = 0;
      var reasons = [];

      var cuisineMatch = (context.favoriteCuisines || []).some(function (item) {
        return normalize(item) === normalize(restaurant.cuisine);
      });
      if (cuisineMatch) {
        score += 30;
        reasons.push("Cuisine match");
      }

      if (normalize(context.budget) && normalize(context.budget) === normalize(restaurant.priceBand)) {
        score += 15;
        reasons.push("Budget match");
      }

      if (safeMenu.length > 0) {
        score += 20;
        reasons.push("Allergy-safe menu options");
      } else {
        score -= 30;
      }

      var orderFreq = history.restaurantCount[restaurant.id] || 0;
      if (orderFreq > 0) {
        var boost = Math.min(20, orderFreq * 6);
        score += boost;
        reasons.push("Based on previous orders");
      }

      score += Math.round((restaurant.rating || 4) * 4);

      var recommendedItems = safeMenu
        .slice()
        .sort(function (a, b) {
          var aHistory = history.itemCount[normalize(a.name)] || 0;
          var bHistory = history.itemCount[normalize(b.name)] || 0;
          if (aHistory !== bHistory) return bHistory - aHistory;
          return a.price - b.price;
        })
        .slice(0, 3);

      return {
        restaurant: restaurant,
        safeMenu: safeMenu,
        conflicts: conflicts,
        recommendedItems: recommendedItems,
        reasons: reasons,
        score: score
      };
    });

    results.sort(function (a, b) {
      return b.score - a.score;
    });

    return { results: results };
  }

  function endpoint() {
    if (window && window.CANEATLAH_RECOMMENDER_URL) {
      return String(window.CANEATLAH_RECOMMENDER_URL);
    }
    return DEFAULT_ENDPOINT;
  }

  function endpointBase() {
    return endpoint().replace(/\/recommend\/?$/i, "");
  }

  function withTimeout(promise, timeoutMs) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error("Recommendation service timeout."));
        }, timeoutMs || DEFAULT_TIMEOUT_MS);
      })
    ]);
  }

  function remoteRecommend(payload) {
    return withTimeout(
      fetch(endpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload || {})
      }).then(function (response) {
        if (!response.ok) {
          throw new Error("Recommendation service error: " + response.status);
        }
        return response.json();
      }),
      DEFAULT_TIMEOUT_MS
    );
  }

  function recommend(payload) {
    return remoteRecommend(payload).catch(function () {
      return localRecommend(payload);
    });
  }

  function uploadPdf(path, file, timeoutMs) {
    if (!file) {
      return Promise.reject(new Error("No file provided."));
    }
    var form = new FormData();
    form.append("file", file);
    return withTimeout(
      fetch(endpointBase() + path, {
        method: "POST",
        body: form
      }).then(function (response) {
        if (!response.ok) {
          throw new Error("Upload service error: " + response.status);
        }
        return response.json();
      }),
      timeoutMs || 12000
    );
  }

  function extractAllergiesLocal(file) {
    var name = normalize(file && file.name);
    var map = [
      "peanut",
      "tree nut",
      "dairy",
      "egg",
      "fish",
      "shellfish",
      "soy",
      "gluten",
      "sesame",
      "mustard",
      "celery"
    ];
    var found = map.filter(function (item) {
      return name.indexOf(item.replace(" ", "")) >= 0 || name.indexOf(item) >= 0;
    });
    return {
      allergies: found.map(function (item) {
        return item.split(" ").map(function (word) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(" ");
      }),
      confidence: found.length ? 0.2 : 0,
      notes: found.length
        ? "Low-confidence local extraction based on filename."
        : "Unable to auto-extract locally. Start AI service for full PDF parsing."
    };
  }

  function extractMenuLocal() {
    return {
      items: [],
      summary: {
        itemsDetected: 0,
        duplicatesRemoved: 0
      },
      notes: "Local fallback cannot parse menu PDFs. Start AI service for full parsing."
    };
  }

  function extractAllergiesFromReport(file) {
    return uploadPdf("/extract-allergies", file, 15000).catch(function () {
      return extractAllergiesLocal(file);
    });
  }

  function extractMenuFromPdf(file) {
    return uploadPdf("/extract-menu", file, 18000).catch(function () {
      return extractMenuLocal();
    });
  }

  window.recommendationService = {
    getRecommendations: recommend,
    getRecommendationsRemote: remoteRecommend,
    getRecommendationsLocal: localRecommend,
    extractAllergiesFromReport: extractAllergiesFromReport,
    extractMenuFromPdf: extractMenuFromPdf
  };
})();
