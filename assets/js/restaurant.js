(function () {
  var KEYS = {
    restaurants: "can_eat_lah_restaurants",
    orders: "can_eat_lah_orders",
    reservations: "can_eat_lah_reservations"
  };

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function uid(prefix) {
    return prefix + "_" + Math.random().toString(36).slice(2, 9);
  }

  function clean(value) {
    return (value || "").trim();
  }

  function normalize(value) {
    return clean(value).toLowerCase();
  }

  function csv(value) {
    return clean(value)
      .split(",")
      .map(function (item) { return clean(item); })
      .filter(Boolean);
  }

  function uniqueList(values) {
    var map = {};
    return (values || []).filter(function (item) {
      var key = normalize(item);
      if (!key || map[key]) return false;
      map[key] = true;
      return true;
    });
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function setHtml(id, value) {
    var node = document.getElementById(id);
    if (node) node.innerHTML = value;
  }

  function formatMoney(value) {
    return "$" + Number(value || 0).toFixed(2);
  }

  function formatDate(value) {
    try {
      return new Date(value).toLocaleString();
    } catch (error) {
      return value;
    }
  }

  function owner() {
    var user = window.appAuth.currentUser();
    return user && user.role === "restaurant" ? user : null;
  }

  function updateOwner(mutator) {
    var current = owner();
    if (!current) return null;
    var users = window.appStorage.getUsers();
    var index = users.findIndex(function (item) { return item.id === current.id; });
    if (index < 0) return null;
    mutator(users[index]);
    window.appStorage.saveUsers(users);
    return users[index];
  }

  function ensureOwnerRestaurant() {
    var current = owner();
    if (!current) return null;

    updateOwner(function (user) {
      user.restaurant = user.restaurant || {};
      user.restaurant.name = user.restaurant.name || (user.fullName + " Kitchen");
      user.restaurant.cuisine = user.restaurant.cuisine || "Multi Cuisine";
      user.restaurant.location = user.restaurant.location || "Downtown";
      user.restaurant.description = user.restaurant.description || "Owner managed restaurant profile.";
      user.restaurant.priceBand = user.restaurant.priceBand || "medium";
    });

    var latestOwner = owner();
    var data = latestOwner.restaurant;
    var restaurants = read(KEYS.restaurants, []);

    var record = restaurants.find(function (item) {
      return item.ownerId === latestOwner.id;
    }) || null;

    if (!record && data.name) {
      record = restaurants.find(function (item) {
        return !item.ownerId && normalize(item.name) === normalize(data.name);
      }) || null;
      if (record) {
        record.ownerId = latestOwner.id;
      }
    }

    if (!record) {
      record = {
        id: uid("res_owner"),
        ownerId: latestOwner.id,
        name: data.name,
        cuisine: data.cuisine,
        location: data.location,
        rating: 4.2,
        priceBand: data.priceBand || "medium",
        description: data.description || "Owner managed restaurant profile.",
        tags: [normalize(data.cuisine)],
        menu: []
      };
      restaurants.push(record);
    }

    record.ownerId = latestOwner.id;
    record.name = record.name || data.name;
    record.cuisine = record.cuisine || data.cuisine;
    record.location = record.location || data.location;
    record.description = record.description || data.description;
    record.priceBand = record.priceBand || data.priceBand || "medium";
    record.tags = Array.isArray(record.tags) ? record.tags : [];
    record.menu = Array.isArray(record.menu) ? record.menu : [];

    write(KEYS.restaurants, restaurants);
    return record;
  }

  function saveRestaurantProfile(payload) {
    var current = owner();
    if (!current) return { ok: false, message: "Sign in required." };

    updateOwner(function (user) {
      user.restaurant.name = payload.name;
      user.restaurant.cuisine = payload.cuisine;
      user.restaurant.location = payload.location;
      user.restaurant.description = payload.description;
      user.restaurant.priceBand = payload.priceBand;
    });

    var restaurants = read(KEYS.restaurants, []);
    var record = restaurants.find(function (item) { return item.ownerId === current.id; });
    if (!record) return { ok: false, message: "Restaurant record missing." };

    record.name = payload.name;
    record.cuisine = payload.cuisine;
    record.location = payload.location;
    record.description = payload.description;
    record.priceBand = payload.priceBand;
    record.tags = csv(payload.tags).map(normalize);

    write(KEYS.restaurants, restaurants);
    return { ok: true };
  }

  function getOwnerRestaurant() {
    return ensureOwnerRestaurant();
  }

  function getMenu() {
    var restaurant = ensureOwnerRestaurant();
    return restaurant ? restaurant.menu : [];
  }

  function upsertMenuItem(payload) {
    var restaurant = ensureOwnerRestaurant();
    if (!restaurant) return { ok: false, message: "Restaurant context missing." };

    var name = clean(payload.name);
    var price = Number(payload.price);
    if (!name) return { ok: false, message: "Item name is required." };
    if (!price || price <= 0) return { ok: false, message: "Valid price is required." };

    var restaurants = read(KEYS.restaurants, []);
    var record = restaurants.find(function (item) { return item.id === restaurant.id; });
    if (!record) return { ok: false, message: "Restaurant record missing." };

    var item = null;
    if (payload.itemId) {
      item = record.menu.find(function (entry) { return entry.id === payload.itemId; }) || null;
    }

    if (!item) {
      item = {
        id: uid("menu"),
        name: "",
        price: 0,
        ingredients: "",
        quantityInfo: "",
        dishTags: [],
        allergyTags: [],
        availability: "available"
      };
      record.menu.push(item);
    }

    item.name = name;
    item.price = price;
    item.ingredients = clean(payload.ingredients);
    item.quantityInfo = clean(payload.quantityInfo);
    item.dishTags = csv(payload.dishTags);
    item.allergyTags = csv(payload.allergyTags).map(normalize);
    item.availability = payload.availability || item.availability || "available";

    write(KEYS.restaurants, restaurants);
    return { ok: true, item: item };
  }

  function toNumber(value, fallback) {
    var num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : (fallback || 0);
  }

  function sanitizeImportedItem(raw) {
    var allergyTags = uniqueList((raw && raw.allergyTags) || []).map(normalize).filter(Boolean);
    return {
      name: clean(raw && raw.name),
      price: toNumber(raw && raw.price, 10.5),
      ingredients: clean(raw && raw.ingredients) || "Imported from uploaded PDF.",
      quantityInfo: clean(raw && raw.quantityInfo),
      dishTags: uniqueList((raw && raw.dishTags) || []),
      allergyTags: allergyTags,
      availability: clean(raw && raw.availability) || "available"
    };
  }

  function importMenuItems(payloadItems, mode) {
    var restaurant = ensureOwnerRestaurant();
    if (!restaurant) {
      return { ok: false, message: "Restaurant context missing." };
    }

    var rows = Array.isArray(payloadItems) ? payloadItems : [];
    if (!rows.length) {
      return {
        ok: true,
        created: 0,
        updated: 0,
        skipped: 0,
        duplicateInputs: 0
      };
    }

    var restaurants = read(KEYS.restaurants, []);
    var record = restaurants.find(function (item) { return item.id === restaurant.id; });
    if (!record) {
      return { ok: false, message: "Restaurant record missing." };
    }

    record.menu = Array.isArray(record.menu) ? record.menu : [];

    var existingByName = {};
    record.menu.forEach(function (item) {
      var key = normalize(item && item.name);
      if (key && !existingByName[key]) {
        existingByName[key] = item;
      }
      item.dishTags = uniqueList(item.dishTags || []);
      item.allergyTags = uniqueList(item.allergyTags || []).map(normalize).filter(Boolean);
      item.availability = clean(item.availability) || "available";
    });

    var appendOnly = normalize(mode) === "append";
    var created = 0;
    var updated = 0;
    var skipped = 0;
    var duplicateInputs = 0;
    var seenImportNames = {};

    rows.forEach(function (raw) {
      var item = sanitizeImportedItem(raw);
      var nameKey = normalize(item.name);
      if (!nameKey) {
        skipped += 1;
        return;
      }

      if (seenImportNames[nameKey]) {
        duplicateInputs += 1;
        return;
      }
      seenImportNames[nameKey] = true;

      var existing = existingByName[nameKey] || null;
      if (existing) {
        if (appendOnly) {
          skipped += 1;
          return;
        }

        existing.price = toNumber(item.price, existing.price);
        existing.ingredients = item.ingredients || existing.ingredients || "";
        existing.quantityInfo = item.quantityInfo || existing.quantityInfo || "";
        existing.dishTags = uniqueList((existing.dishTags || []).concat(item.dishTags || []));
        existing.allergyTags = uniqueList((existing.allergyTags || []).concat(item.allergyTags || []))
          .map(normalize)
          .filter(Boolean);
        existing.availability = item.availability || existing.availability || "available";
        updated += 1;
        return;
      }

      var createdItem = {
        id: uid("menu"),
        name: item.name,
        price: item.price,
        ingredients: item.ingredients,
        quantityInfo: item.quantityInfo,
        dishTags: item.dishTags,
        allergyTags: item.allergyTags,
        availability: item.availability
      };
      record.menu.push(createdItem);
      existingByName[nameKey] = createdItem;
      created += 1;
    });

    write(KEYS.restaurants, restaurants);
    return {
      ok: true,
      created: created,
      updated: updated,
      skipped: skipped,
      duplicateInputs: duplicateInputs
    };
  }

  function deleteMenuItem(itemId) {
    var restaurant = ensureOwnerRestaurant();
    if (!restaurant) return;
    var restaurants = read(KEYS.restaurants, []);
    var record = restaurants.find(function (item) { return item.id === restaurant.id; });
    if (!record) return;
    record.menu = (record.menu || []).filter(function (item) { return item.id !== itemId; });
    write(KEYS.restaurants, restaurants);
  }

  function toggleMenuAvailability(itemId) {
    var restaurant = ensureOwnerRestaurant();
    if (!restaurant) return;
    var restaurants = read(KEYS.restaurants, []);
    var record = restaurants.find(function (item) { return item.id === restaurant.id; });
    if (!record) return;
    var menuItem = (record.menu || []).find(function (item) { return item.id === itemId; });
    if (!menuItem) return;
    menuItem.availability = menuItem.availability === "available" ? "unavailable" : "available";
    write(KEYS.restaurants, restaurants);
  }

  function userNameById(id) {
    var users = window.appStorage.getUsers();
    var person = users.find(function (item) { return item.id === id; });
    return person ? person.fullName : "Unknown User";
  }

  function getOrders() {
    var restaurant = ensureOwnerRestaurant();
    if (!restaurant) return [];
    return read(KEYS.orders, [])
      .filter(function (item) { return item.restaurantId === restaurant.id; })
      .sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
  }

  function updateOrderStatus(orderId, status) {
    var orders = read(KEYS.orders, []);
    var order = orders.find(function (item) { return item.id === orderId; });
    if (!order) return;
    order.status = status;
    write(KEYS.orders, orders);
  }

  function seedReservations() {
    var restaurant = ensureOwnerRestaurant();
    if (!restaurant) return;
    var reservations = read(KEYS.reservations, []);
    var existing = reservations.filter(function (item) { return item.restaurantId === restaurant.id; });
    if (existing.length) return;

    reservations.push(
      {
        id: uid("resv"),
        restaurantId: restaurant.id,
        customerName: "Alicia Brown",
        contact: "alicia@example.com",
        partySize: 3,
        datetime: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
        notes: "Nut allergy in group.",
        status: "Pending",
        createdAt: nowIso()
      },
      {
        id: uid("resv"),
        restaurantId: restaurant.id,
        customerName: "Daniel Smith",
        contact: "daniel@example.com",
        partySize: 2,
        datetime: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        notes: "Window seat if available.",
        status: "Confirmed",
        createdAt: nowIso()
      }
    );

    write(KEYS.reservations, reservations);
  }

  function getReservations() {
    seedReservations();
    var restaurant = ensureOwnerRestaurant();
    if (!restaurant) return [];
    return read(KEYS.reservations, [])
      .filter(function (item) { return item.restaurantId === restaurant.id; })
      .sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
  }

  function createReservation(payload) {
    var restaurant = ensureOwnerRestaurant();
    if (!restaurant) return { ok: false, message: "Restaurant context missing." };
    if (!clean(payload.customerName)) return { ok: false, message: "Customer name is required." };
    if (!clean(payload.datetime)) return { ok: false, message: "Date and time is required." };

    var reservations = read(KEYS.reservations, []);
    reservations.push({
      id: uid("resv"),
      restaurantId: restaurant.id,
      customerName: clean(payload.customerName),
      contact: clean(payload.contact),
      partySize: Number(payload.partySize) || 1,
      datetime: new Date(payload.datetime).toISOString(),
      notes: clean(payload.notes),
      status: "Pending",
      createdAt: nowIso()
    });

    write(KEYS.reservations, reservations);
    return { ok: true };
  }

  function updateReservationStatus(reservationId, status) {
    var reservations = read(KEYS.reservations, []);
    var item = reservations.find(function (entry) { return entry.id === reservationId; });
    if (!item) return;
    item.status = status;
    write(KEYS.reservations, reservations);
  }

  function navGreeting() {
    var current = owner();
    if (!current) return;
    setText("ownerName", current.fullName);
  }

  function renderStatusBadge(status) {
    var value = clean(status);
    var klass = value === "Cancelled" || value === "Rejected" ? "pill-warn" : "pill-ok";
    return '<span class="' + klass + '">' + (value || "-") + "</span>";
  }

  function initDashboard() {
    navGreeting();
    var restaurant = ensureOwnerRestaurant();
    if (!restaurant) return;

    var orders = getOrders();
    var reservations = getReservations();
    var menu = restaurant.menu || [];

    var pendingOrders = orders.filter(function (item) {
      return item.status === "Placed" || item.status === "Preparing";
    }).length;

    var pendingReservations = reservations.filter(function (item) {
      return item.status === "Pending";
    }).length;

    var revenue = orders
      .filter(function (item) { return item.status !== "Cancelled"; })
      .reduce(function (sum, item) {
        return sum + Number(item.total || 0);
      }, 0);

    setText("restaurantName", restaurant.name);
    setText("restaurantMeta", restaurant.cuisine + " | " + restaurant.location);
    setText("metricMenu", String(menu.length));
    setText("metricOrders", String(pendingOrders));
    setText("metricReservations", String(pendingReservations));
    setText("metricRevenue", formatMoney(revenue));

    if (!orders.length) {
      setHtml("recentOrders", '<div class="empty">No orders received yet.</div>');
    } else {
      setHtml("recentOrders", '<ul class="list-clean">' + orders.slice(0, 5).map(function (order) {
        return '<li><strong>' + order.id + '</strong> | ' + userNameById(order.userId) + '<div class="small-note">' + formatDate(order.createdAt) + ' | ' + renderStatusBadge(order.status) + ' | ' + formatMoney(order.total) + '</div></li>';
      }).join("") + "</ul>");
    }

    if (!reservations.length) {
      setHtml("recentReservations", '<div class="empty">No reservations received yet.</div>');
    } else {
      setHtml("recentReservations", '<ul class="list-clean">' + reservations.slice(0, 5).map(function (item) {
        return '<li><strong>' + item.customerName + '</strong> | Party ' + item.partySize + '<div class="small-note">' + formatDate(item.datetime) + ' | ' + renderStatusBadge(item.status) + '</div></li>';
      }).join("") + "</ul>");
    }

    var form = document.getElementById("restaurantProfileForm");
    var msg = document.getElementById("profileMessage");
    form.name.value = restaurant.name || "";
    form.cuisine.value = restaurant.cuisine || "";
    form.location.value = restaurant.location || "";
    form.priceBand.value = restaurant.priceBand || "medium";
    form.tags.value = (restaurant.tags || []).join(", ");
    form.description.value = restaurant.description || "";

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var result = saveRestaurantProfile({
        name: clean(form.name.value),
        cuisine: clean(form.cuisine.value),
        location: clean(form.location.value),
        priceBand: clean(form.priceBand.value),
        tags: clean(form.tags.value),
        description: clean(form.description.value)
      });

      if (!result.ok) {
        msg.className = "form-message error";
        msg.textContent = result.message;
        return;
      }

      msg.className = "form-message ok";
      msg.textContent = "Restaurant profile updated.";
      var latest = ensureOwnerRestaurant();
      setText("restaurantName", latest.name);
      setText("restaurantMeta", latest.cuisine + " | " + latest.location);
    });
  }

  function initMenu() {
    navGreeting();
    var restaurant = ensureOwnerRestaurant();
    if (!restaurant) return;
    setText("restaurantName", restaurant.name);

    var form = document.getElementById("menuForm");
    var msg = document.getElementById("menuMessage");
    var resetBtn = document.getElementById("menuResetBtn");
    var importForm = document.getElementById("menuImportForm");
    var importMsg = document.getElementById("menuImportMessage");

    function renderMenu() {
      var latest = ensureOwnerRestaurant();
      var menu = latest.menu || [];

      if (!menu.length) {
        setHtml("menuTable", '<div class="empty">No menu items yet.</div>');
        return;
      }

      setHtml("menuTable", '<div class="table-wrap"><table><thead><tr><th>Item</th><th>Price</th><th>Ingredients</th><th>Quantity</th><th>Dish Tags</th><th>Allergy Tags</th><th>Availability</th><th>Action</th></tr></thead><tbody>' + menu.map(function (item) {
        return '<tr><td><strong>' + item.name + '</strong></td><td>' + formatMoney(item.price) + '</td><td>' + (item.ingredients || "-") + '</td><td>' + (item.quantityInfo || "-") + '</td><td>' + ((item.dishTags || []).join(", ") || "-") + '</td><td>' + ((item.allergyTags || []).join(", ") || "None") + '</td><td>' + renderStatusBadge(item.availability === "unavailable" ? "Unavailable" : "Available") + '</td><td><div class="split-actions"><button type="button" class="btn btn-secondary edit-item" data-id="' + item.id + '">Edit</button><button type="button" class="btn btn-secondary avail-item" data-id="' + item.id + '">Toggle</button><button type="button" class="btn btn-secondary del-item" data-id="' + item.id + '">Delete</button></div></td></tr>';
      }).join("") + "</tbody></table></div>");

      Array.prototype.slice.call(document.querySelectorAll(".edit-item")).forEach(function (button) {
        button.addEventListener("click", function () {
          var itemId = button.getAttribute("data-id");
          var current = ensureOwnerRestaurant().menu.find(function (entry) { return entry.id === itemId; });
          if (!current) return;
          form.itemId.value = current.id;
          form.name.value = current.name;
          form.price.value = current.price;
          form.ingredients.value = current.ingredients || "";
          form.quantityInfo.value = current.quantityInfo || "";
          form.dishTags.value = (current.dishTags || []).join(", ");
          form.allergyTags.value = (current.allergyTags || []).join(", ");
          form.availability.value = current.availability || "available";
          msg.className = "form-message ok";
          msg.textContent = "Editing item: " + current.name;
        });
      });

      Array.prototype.slice.call(document.querySelectorAll(".avail-item")).forEach(function (button) {
        button.addEventListener("click", function () {
          toggleMenuAvailability(button.getAttribute("data-id"));
          renderMenu();
        });
      });

      Array.prototype.slice.call(document.querySelectorAll(".del-item")).forEach(function (button) {
        button.addEventListener("click", function () {
          deleteMenuItem(button.getAttribute("data-id"));
          renderMenu();
        });
      });
    }

    function clearForm() {
      form.reset();
      form.itemId.value = "";
      form.availability.value = "available";
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var result = upsertMenuItem({
        itemId: clean(form.itemId.value),
        name: clean(form.name.value),
        price: clean(form.price.value),
        ingredients: clean(form.ingredients.value),
        quantityInfo: clean(form.quantityInfo.value),
        dishTags: clean(form.dishTags.value),
        allergyTags: clean(form.allergyTags.value),
        availability: clean(form.availability.value)
      });

      if (!result.ok) {
        msg.className = "form-message error";
        msg.textContent = result.message;
        return;
      }

      msg.className = "form-message ok";
      msg.textContent = "Menu item saved.";
      clearForm();
      renderMenu();
    });

    resetBtn.addEventListener("click", clearForm);

    if (importForm && importMsg) {
      importForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var fileInput = document.getElementById("menuPdfFile");
        var modeInput = document.getElementById("menuImportMode");
        var file = fileInput && fileInput.files && fileInput.files[0];
        var mode = clean(modeInput && modeInput.value) || "merge";
        var submitBtn = importForm.querySelector('button[type="submit"]');

        if (!file) {
          importMsg.className = "form-message error";
          importMsg.textContent = "Please select a PDF file first.";
          return;
        }

        if (!window.recommendationService || !window.recommendationService.extractMenuFromPdf) {
          importMsg.className = "form-message error";
          importMsg.textContent = "AI importer is unavailable. Please reload and try again.";
          return;
        }

        if (submitBtn) submitBtn.disabled = true;
        importMsg.className = "form-message";
        importMsg.textContent = "Reading PDF and importing menu...";

        window.recommendationService.extractMenuFromPdf(file).then(function (result) {
          var items = (result && result.items) || [];
          var parserSummary = (result && result.summary) || {};

          if (!items.length) {
            importMsg.className = normalize(result && result.notes).indexOf("start ai service") >= 0
              ? "form-message error"
              : "form-message";
            importMsg.textContent = (result && result.notes) || "No menu rows detected in this PDF.";
            return;
          }

          var importResult = importMenuItems(items, mode);

          if (!importResult.ok) {
            importMsg.className = "form-message error";
            importMsg.textContent = importResult.message || "Import failed.";
            return;
          }

          var parserDuplicates = Number(parserSummary.duplicatesRemoved || 0);
          var parts = [
            "Imported " + importResult.created + " new",
            "updated " + importResult.updated,
            "skipped " + importResult.skipped
          ];

          if (importResult.duplicateInputs || parserDuplicates) {
            parts.push("duplicates removed " + (importResult.duplicateInputs + parserDuplicates));
          }

          if (result && result.notes) {
            parts.push(result.notes);
          }

          importMsg.className = "form-message ok";
          importMsg.textContent = parts.join(" | ") + ".";
          renderMenu();
          importForm.reset();
        }).catch(function (error) {
          importMsg.className = "form-message error";
          importMsg.textContent = (error && error.message) ? error.message : "Could not import menu from this PDF.";
        }).then(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
      });
    }

    clearForm();
    renderMenu();
  }

  function initOrders() {
    navGreeting();
    var restaurant = ensureOwnerRestaurant();
    if (!restaurant) return;
    setText("restaurantName", restaurant.name);

    function renderOrders() {
      var orders = getOrders();
      if (!orders.length) {
        setHtml("ordersTable", '<div class="empty">No orders for your restaurant yet.</div>');
        return;
      }

      setHtml("ordersTable", '<div class="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Time</th><th>Items</th><th>Notes</th><th>Status</th><th>Total</th><th>Action</th></tr></thead><tbody>' + orders.map(function (order) {
        var items = (order.items || []).map(function (item) { return item.name + " x" + item.quantity; }).join(", ");
        return '<tr><td><strong>' + order.id + '</strong><div class="small-note">' + (order.groupId ? "Group" : "Solo") + '</div></td><td>' + userNameById(order.userId) + '</td><td>' + formatDate(order.createdAt) + '</td><td>' + items + '</td><td>' + (order.notes || "-") + '</td><td><select class="order-status" data-id="' + order.id + '"><option value="Placed"' + (order.status === "Placed" ? " selected" : "") + '>Placed</option><option value="Preparing"' + (order.status === "Preparing" ? " selected" : "") + '>Preparing</option><option value="Ready"' + (order.status === "Ready" ? " selected" : "") + '>Ready</option><option value="Completed"' + (order.status === "Completed" ? " selected" : "") + '>Completed</option><option value="Cancelled"' + (order.status === "Cancelled" ? " selected" : "") + '>Cancelled</option></select></td><td>' + formatMoney(order.total) + '</td><td><button type="button" class="btn btn-secondary save-order" data-id="' + order.id + '">Update</button></td></tr>';
      }).join("") + "</tbody></table></div>");

      Array.prototype.slice.call(document.querySelectorAll(".save-order")).forEach(function (button) {
        button.addEventListener("click", function () {
          var orderId = button.getAttribute("data-id");
          var select = document.querySelector('.order-status[data-id="' + orderId + '"]');
          updateOrderStatus(orderId, select.value);
          renderOrders();
        });
      });
    }

    renderOrders();
  }

  function initReservations() {
    navGreeting();
    var restaurant = ensureOwnerRestaurant();
    if (!restaurant) return;
    setText("restaurantName", restaurant.name);

    var form = document.getElementById("reservationForm");
    var msg = document.getElementById("reservationMessage");

    function renderReservations() {
      var rows = getReservations();
      if (!rows.length) {
        setHtml("reservationsTable", '<div class="empty">No reservations for your restaurant yet.</div>');
        return;
      }

      setHtml("reservationsTable", '<div class="table-wrap"><table><thead><tr><th>Reservation</th><th>Customer</th><th>Contact</th><th>Date/Time</th><th>Party</th><th>Notes</th><th>Status</th><th>Action</th></tr></thead><tbody>' + rows.map(function (item) {
        return '<tr><td><strong>' + item.id + '</strong><div class="small-note">' + formatDate(item.createdAt) + '</div></td><td>' + item.customerName + '</td><td>' + (item.contact || "-") + '</td><td>' + formatDate(item.datetime) + '</td><td>' + item.partySize + '</td><td>' + (item.notes || "-") + '</td><td><select class="resv-status" data-id="' + item.id + '"><option value="Pending"' + (item.status === "Pending" ? " selected" : "") + '>Pending</option><option value="Confirmed"' + (item.status === "Confirmed" ? " selected" : "") + '>Confirmed</option><option value="Completed"' + (item.status === "Completed" ? " selected" : "") + '>Completed</option><option value="Rejected"' + (item.status === "Rejected" ? " selected" : "") + '>Rejected</option></select></td><td><button type="button" class="btn btn-secondary save-resv" data-id="' + item.id + '">Update</button></td></tr>';
      }).join("") + "</tbody></table></div>");

      Array.prototype.slice.call(document.querySelectorAll(".save-resv")).forEach(function (button) {
        button.addEventListener("click", function () {
          var reservationId = button.getAttribute("data-id");
          var select = document.querySelector('.resv-status[data-id="' + reservationId + '"]');
          updateReservationStatus(reservationId, select.value);
          renderReservations();
        });
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var result = createReservation({
        customerName: clean(form.customerName.value),
        contact: clean(form.contact.value),
        datetime: clean(form.datetime.value),
        partySize: clean(form.partySize.value),
        notes: clean(form.notes.value)
      });

      if (!result.ok) {
        msg.className = "form-message error";
        msg.textContent = result.message;
        return;
      }

      form.reset();
      msg.className = "form-message ok";
      msg.textContent = "Reservation captured.";
      renderReservations();
    });

    renderReservations();
  }

  window.restaurantPortal = {
    initDashboard: initDashboard,
    initMenu: initMenu,
    initOrders: initOrders,
    initReservations: initReservations
  };
})();
