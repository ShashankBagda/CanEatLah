(function () {
  var KEYS = {
    restaurants: "can_eat_lah_restaurants",
    reports: "can_eat_lah_medical_reports",
    groups: "can_eat_lah_groups",
    orders: "can_eat_lah_orders",
    carts: "can_eat_lah_carts",
    activeGroups: "can_eat_lah_active_groups"
  };

  var GROUP_CONTEXT_ACTIVE = "__active__";
  var GROUP_CONTEXT_NONE = "__none__";

  function read(key, fallback) {
    try {
      var value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function write(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
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
      .map(function (token) { return clean(token); })
      .filter(Boolean);
  }

  function uniqueValues(list) {
    var map = {};
    return (list || []).filter(function (item) {
      var key = normalize(item);
      if (!key || map[key]) return false;
      map[key] = true;
      return true;
    });
  }

  function titleCase(value) {
    return clean(value)
      .split(" ")
      .filter(Boolean)
      .map(function (word) { return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(); })
      .join(" ");
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function user() {
    return window.appAuth.currentUser();
  }

  function ensureDiner() {
    ensureUserDirectory();
    var current = user();
    return current && current.role === "diner" ? current : null;
  }

  function allUsers() {
    return window.appStorage.getUsers();
  }

  function getUserById(userId) {
    return allUsers().find(function (item) {
      return item.id === userId;
    }) || null;
  }

  function dinerUsers() {
    return allUsers().filter(function (item) {
      return item.role === "diner";
    });
  }

  function normalizePhone(value) {
    return clean(value).replace(/[^0-9]/g, "");
  }

  function ensureUserDirectory() {
    var list = allUsers();
    var changed = false;
    var seen = {};

    list.forEach(function (item) {
      var base = normalize(item.username || item.fullName || (item.email || "").split("@")[0] || "user")
        .replace(/[^a-z0-9_.-]/g, "") || "user";

      var candidate = base;
      var index = 1;
      while (seen[candidate]) {
        candidate = base + index;
        index += 1;
      }
      seen[candidate] = true;

      if (item.username !== candidate) {
        item.username = candidate;
        changed = true;
      }

      var normalizedPhone = normalizePhone(item.phone || "");
      if ((item.phone || "") !== normalizedPhone) {
        item.phone = normalizedPhone;
        changed = true;
      }
    });

    if (changed) {
      window.appStorage.saveUsers(list);
    }
  }

  function seedRestaurants() {
    var existing = read(KEYS.restaurants, []);
    var defaults = [
      {
        id: "res_garden_bowl",
        name: "Garden Bowl Kitchen",
        cuisine: "Healthy",
        location: "Downtown",
        rating: 4.7,
        priceBand: "medium",
        description: "Fresh bowls and ingredient-focused meals.",
        tags: ["healthy", "gluten-aware", "salads"],
        menu: [
          { id: "gb_1", name: "Herb Chicken Bowl", price: 14.5, ingredients: "Chicken 120g, lettuce, quinoa, cucumber", allergyTags: [] },
          { id: "gb_2", name: "Peanut Crunch Salad", price: 12.8, ingredients: "Lettuce, peanut crumble 20g, carrot", allergyTags: ["peanut", "sesame"] },
          { id: "gb_3", name: "Tofu Power Plate", price: 13.2, ingredients: "Tofu 100g, brown rice, broccoli", allergyTags: ["soy"] }
        ]
      },
      {
        id: "res_blue_harbor",
        name: "Blue Harbor Grill",
        cuisine: "Seafood",
        location: "Riverfront",
        rating: 4.5,
        priceBand: "high",
        description: "Seafood-focused grill with clear allergen markings.",
        tags: ["seafood", "grill"],
        menu: [
          { id: "bh_1", name: "Grilled Salmon Plate", price: 19.5, ingredients: "Salmon 180g, mashed potato, asparagus", allergyTags: ["fish", "dairy"] },
          { id: "bh_2", name: "Shrimp Garlic Rice", price: 17.8, ingredients: "Shrimp 150g, jasmine rice, garlic", allergyTags: ["shellfish"] },
          { id: "bh_3", name: "Roasted Veggie Pasta", price: 15.2, ingredients: "Penne, zucchini, tomato, basil", allergyTags: ["gluten"] }
        ]
      },
      {
        id: "res_spice_route",
        name: "Spice Route House",
        cuisine: "Indian",
        location: "Midtown",
        rating: 4.6,
        priceBand: "medium",
        description: "Indian flavors with customizable spice levels.",
        tags: ["indian", "spicy"],
        menu: [
          { id: "sr_1", name: "Paneer Tikka Wrap", price: 11.9, ingredients: "Paneer, wheat wrap, onion", allergyTags: ["dairy", "gluten"] },
          { id: "sr_2", name: "Lentil Curry Bowl", price: 10.5, ingredients: "Lentils, tomato, cumin, rice", allergyTags: [] },
          { id: "sr_3", name: "Cashew Butter Masala", price: 13.8, ingredients: "Tomato gravy, cashew paste, cream", allergyTags: ["tree nut", "dairy"] }
        ]
      },
      {
        id: "res_green_leaf",
        name: "Green Leaf Vegan",
        cuisine: "Vegan",
        location: "North Quarter",
        rating: 4.8,
        priceBand: "low",
        description: "Plant-forward menu with clear labels.",
        tags: ["vegan", "plant-based", "budget"],
        menu: [
          { id: "gl_1", name: "Chickpea Protein Bowl", price: 9.8, ingredients: "Chickpea, kale, millet, tahini", allergyTags: ["sesame"] },
          { id: "gl_2", name: "Tomato Basil Soup Combo", price: 8.6, ingredients: "Tomato soup, sourdough toast", allergyTags: ["gluten"] },
          { id: "gl_3", name: "Coconut Curry Pot", price: 10.4, ingredients: "Coconut milk, vegetables, rice", allergyTags: [] }
        ]
      }
    ];

    var byId = {};
    existing.forEach(function (item) {
      byId[item.id] = true;
    });

    var merged = existing.slice();
    defaults.forEach(function (item) {
      if (!byId[item.id]) {
        merged.push(item);
      }
    });

    write(KEYS.restaurants, merged);
  }

  function ensureUserProfile() {
    var current = ensureDiner();
    if (!current) return null;
    var users = window.appStorage.getUsers();
    var index = users.findIndex(function (item) { return item.id === current.id; });
    if (index < 0) return null;
    users[index].profile = users[index].profile || {};
    var p = users[index].profile;
    p.favoriteCuisines = Array.isArray(p.favoriteCuisines) ? p.favoriteCuisines : [];
    p.allergies = Array.isArray(p.allergies) ? p.allergies : [];
    if (!Array.isArray(p.dietPreferences)) {
      if (Array.isArray(p.dietPreference)) p.dietPreferences = p.dietPreference;
      else if (clean(p.dietPreference)) p.dietPreferences = [p.dietPreference];
      else p.dietPreferences = [];
    }
    p.dietPreference = p.dietPreference || "";
    p.spiceLevel = p.spiceLevel || "medium";
    p.sugarLevel = p.sugarLevel || "medium";
    p.budget = p.budget || "medium";
    p.notes = p.notes || "";
    p.address = p.address || "";
    p.emergencyContact = p.emergencyContact || "";
    if (!p.dietPreference && p.dietPreferences.length) {
      p.dietPreference = p.dietPreferences[0];
    }
    window.appStorage.saveUsers(users);
    return users[index];
  }

  function updateUser(mutator) {
    var current = ensureDiner();
    if (!current) return null;
    var users = window.appStorage.getUsers();
    var index = users.findIndex(function (item) { return item.id === current.id; });
    if (index < 0) return null;
    mutator(users[index]);
    window.appStorage.saveUsers(users);
    return users[index];
  }

  function getProfile() {
    var u = ensureUserProfile();
    return u ? u.profile : null;
  }

  function saveSurvey(payload) {
    return updateUser(function (u) {
      u.profile.favoriteCuisines = payload.favoriteCuisines;
      u.profile.allergies = payload.allergies;
      u.profile.dietPreferences = payload.dietPreferences;
      u.profile.dietPreference = payload.dietPreferences[0] || "";
      u.profile.spiceLevel = payload.spiceLevel;
      u.profile.sugarLevel = payload.sugarLevel;
      u.profile.budget = payload.budget;
      u.profile.notes = payload.notes;
    });
  }

  function saveProfile(payload) {
    return updateUser(function (u) {
      u.fullName = payload.fullName;
      u.phone = payload.phone;
      u.profile.address = payload.address;
      u.profile.emergencyContact = payload.emergencyContact;
    });
  }

  function mergeProfileAllergies(allergyList) {
    var normalized = uniqueValues((allergyList || []).map(function (item) {
      return titleCase(item);
    }));
    if (!normalized.length) return;
    updateUser(function (u) {
      u.profile.allergies = uniqueValues((u.profile.allergies || []).concat(normalized));
    });
  }

  function getReports() {
    var current = ensureDiner();
    if (!current) return [];
    return read(KEYS.reports, [])
      .filter(function (item) { return item.userId === current.id; })
      .sort(function (a, b) { return b.uploadedAt.localeCompare(a.uploadedAt); });
  }

  function addReport(payload) {
    var current = ensureDiner();
    if (!current) return;
    var reports = read(KEYS.reports, []);
    reports.push({
      id: uid("report"),
      userId: current.id,
      fileName: payload.fileName,
      notes: payload.notes,
      extractedAllergies: payload.extractedAllergies,
      status: "Pending Verification",
      uploadedAt: nowIso()
    });
    write(KEYS.reports, reports);
  }

  function getGroups() {
    var current = ensureDiner();
    if (!current) return [];
    return read(KEYS.groups, [])
      .filter(function (item) { return item.ownerId === current.id; })
      .map(hydrateGroup)
      .sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
  }

  function snapshotMemberFromUser(user) {
    var profile = user.profile || {};
    return {
      userId: user.id,
      name: user.fullName || user.username || user.email,
      username: user.username || "",
      phone: user.phone || "",
      allergies: Array.isArray(profile.allergies) ? profile.allergies : [],
      preferences: Array.isArray(profile.favoriteCuisines) ? profile.favoriteCuisines : []
    };
  }

  function resolveGroupMembers(group) {
    var resolved = [];
    var seenUserIds = {};

    (group.memberUserIds || []).forEach(function (userId) {
      var user = getUserById(userId);
      if (!user || user.role !== "diner") return;
      seenUserIds[userId] = true;
      resolved.push(snapshotMemberFromUser(user));
    });

    (group.members || []).forEach(function (member) {
      if (member.userId && seenUserIds[member.userId]) return;
      if (member.userId) {
        var user = getUserById(member.userId);
        if (user && user.role === "diner") {
          resolved.push(snapshotMemberFromUser(user));
          return;
        }
      }
      resolved.push({
        userId: member.userId || "",
        name: member.name || member.username || "Member",
        username: member.username || "",
        phone: member.phone || "",
        allergies: Array.isArray(member.allergies) ? member.allergies : [],
        preferences: Array.isArray(member.preferences) ? member.preferences : []
      });
    });

    return resolved;
  }

  function groupMeta(group) {
    var allergyMap = {};
    var prefMap = {};
    resolveGroupMembers(group).forEach(function (member) {
      (member.allergies || []).forEach(function (item) { allergyMap[normalize(item)] = titleCase(item); });
      (member.preferences || []).forEach(function (item) { prefMap[normalize(item)] = titleCase(item); });
    });
    return {
      allergies: Object.keys(allergyMap).map(function (k) { return allergyMap[k]; }),
      preferences: Object.keys(prefMap).map(function (k) { return prefMap[k]; })
    };
  }

  function hydrateGroup(group) {
    var meta = groupMeta(group);
    return {
      id: group.id,
      ownerId: group.ownerId,
      name: group.name,
      createdAt: group.createdAt,
      memberUserIds: Array.isArray(group.memberUserIds) ? group.memberUserIds : [],
      members: resolveGroupMembers(group),
      groupAllergies: meta.allergies,
      groupPreferences: meta.preferences
    };
  }

  function createGroup(payload) {
    var current = ensureDiner();
    if (!current) return { ok: false, message: "Sign in required." };
    if (!payload.memberUserIds || !payload.memberUserIds.length) {
      return { ok: false, message: "Add at least one registered diner." };
    }

    var seen = {};
    var deduped = payload.memberUserIds.filter(function (userId) {
      if (seen[userId]) return false;
      seen[userId] = true;
      return true;
    });

    var memberSnapshots = deduped
      .map(function (userId) {
        var member = getUserById(userId);
        if (!member || member.role !== "diner") return null;
        return snapshotMemberFromUser(member);
      })
      .filter(Boolean);

    if (!memberSnapshots.length) {
      return { ok: false, message: "No valid diner members found." };
    }

    var groups = read(KEYS.groups, []);
    var group = {
      id: uid("group"),
      ownerId: current.id,
      name: payload.name,
      memberUserIds: deduped,
      members: memberSnapshots,
      createdAt: nowIso()
    };
    groups.push(group);
    write(KEYS.groups, groups);
    return { ok: true, group: hydrateGroup(group) };
  }

  function updateGroupRecord(groupId, mutator) {
    var current = ensureDiner();
    if (!current) return { ok: false, message: "Sign in required." };
    var groups = read(KEYS.groups, []);
    var index = groups.findIndex(function (item) {
      return item.ownerId === current.id && item.id === groupId;
    });
    if (index < 0) return { ok: false, message: "Group not found." };

    mutator(groups[index]);
    write(KEYS.groups, groups);
    return { ok: true, group: hydrateGroup(groups[index]) };
  }

  function addMemberToGroup(groupId, userId) {
    var member = getUserById(userId);
    if (!member || member.role !== "diner") {
      return { ok: false, message: "Selected member is not a valid diner." };
    }

    return updateGroupRecord(groupId, function (group) {
      group.memberUserIds = Array.isArray(group.memberUserIds) ? group.memberUserIds : [];
      if (group.memberUserIds.indexOf(userId) < 0) {
        group.memberUserIds.push(userId);
      }
      group.members = resolveGroupMembers(group);
    });
  }

  function removeMemberFromGroup(groupId, userId) {
    var existing = getGroups().find(function (item) { return item.id === groupId; }) || null;
    if (!existing) return { ok: false, message: "Group not found." };
    if ((existing.memberUserIds || []).length <= 1) {
      return { ok: false, message: "A group must have at least one member." };
    }

    return updateGroupRecord(groupId, function (group) {
      group.memberUserIds = (group.memberUserIds || []).filter(function (id) { return id !== userId; });
      group.members = resolveGroupMembers(group);
    });
  }

  function deleteGroup(groupId) {
    var current = ensureDiner();
    if (!current) return;
    write(
      KEYS.groups,
      read(KEYS.groups, []).filter(function (item) { return !(item.ownerId === current.id && item.id === groupId); })
    );
    var active = read(KEYS.activeGroups, {});
    if (active[current.id] === groupId) {
      delete active[current.id];
      write(KEYS.activeGroups, active);
    }
  }

  function setActiveGroup(groupId) {
    var current = ensureDiner();
    if (!current) return;
    var active = read(KEYS.activeGroups, {});
    if (!groupId) delete active[current.id];
    else active[current.id] = groupId;
    write(KEYS.activeGroups, active);
  }

  function getActiveGroup() {
    var current = ensureDiner();
    if (!current) return null;
    var activeId = read(KEYS.activeGroups, {})[current.id];
    if (!activeId) return null;
    return getGroups().find(function (item) { return item.id === activeId; }) || null;
  }

  function combinedContext(groupId) {
    var profile = getProfile();
    var allergies = {};
    var cuisines = {};
    (profile.allergies || []).forEach(function (item) { allergies[normalize(item)] = titleCase(item); });
    (profile.favoriteCuisines || []).forEach(function (item) { cuisines[normalize(item)] = titleCase(item); });

    var normalizedGroupId = normalize(groupId);
    var group = null;
    if (normalizedGroupId === normalize(GROUP_CONTEXT_NONE)) {
      group = null;
    } else if (!normalizedGroupId || normalizedGroupId === normalize(GROUP_CONTEXT_ACTIVE)) {
      group = getActiveGroup();
    } else {
      group = getGroups().find(function (item) { return item.id === groupId; }) || null;
    }

    if (group) {
      (group.groupAllergies || []).forEach(function (item) { allergies[normalize(item)] = titleCase(item); });
      (group.groupPreferences || []).forEach(function (item) { cuisines[normalize(item)] = titleCase(item); });
    }

    return {
      group: group,
      allergies: Object.keys(allergies).map(function (k) { return allergies[k]; }),
      favoriteCuisines: Object.keys(cuisines).map(function (k) { return cuisines[k]; }),
      dietPreferences: Array.isArray(profile.dietPreferences) ? profile.dietPreferences : (profile.dietPreference ? [profile.dietPreference] : []),
      spiceLevel: profile.spiceLevel || "medium",
      sugarLevel: profile.sugarLevel || "medium",
      budget: profile.budget || "medium"
    };
  }

  function allOrders() {
    return read(KEYS.orders, []);
  }

  function recommendationHistory(group) {
    var current = ensureDiner();
    if (!current) return [];

    var userIds = {};
    userIds[current.id] = true;
    if (group) {
      (group.memberUserIds || []).forEach(function (userId) {
        userIds[userId] = true;
      });
      (group.members || []).forEach(function (member) {
        if (member.userId) userIds[member.userId] = true;
      });
    }

    return allOrders().filter(function (order) {
      return !!userIds[order.userId];
    });
  }

  function searchDinersByIdentifier(identifier, excludeUserIds) {
    var current = ensureDiner();
    if (!current) return [];
    var term = normalize(identifier).replace(/^@/, "");
    var phoneTerm = normalizePhone(identifier);
    var excluded = {};
    (excludeUserIds || []).forEach(function (userId) {
      excluded[userId] = true;
    });
    excluded[current.id] = true;

    if (!term && !phoneTerm) return [];

    return dinerUsers()
      .filter(function (item) {
        if (excluded[item.id]) return false;
        var username = normalize(item.username);
        var email = normalize(item.email);
        var name = normalize(item.fullName);
        var phone = normalizePhone(item.phone);
        return (
          (term && (username.indexOf(term) >= 0 || email.indexOf(term) >= 0 || name.indexOf(term) >= 0)) ||
          (phoneTerm && phone.indexOf(phoneTerm) >= 0)
        );
      })
      .slice(0, 8)
      .map(function (item) {
        return snapshotMemberFromUser(item);
      });
  }

  function getRestaurants() {
    seedRestaurants();
    return read(KEYS.restaurants, []);
  }

  function findRestaurant(id) {
    return getRestaurants().find(function (item) { return item.id === id; }) || null;
  }

  function intersects(left, right) {
    var set = {};
    (right || []).forEach(function (item) { set[normalize(item)] = true; });
    return (left || []).some(function (item) { return !!set[normalize(item)]; });
  }

  function searchRestaurants(filters) {
    var context = combinedContext(filters.groupId);
    var text = normalize(filters.searchText);
    var cuisine = normalize(filters.cuisine);
    var budget = normalize(filters.budget);
    var source = getRestaurants()
      .filter(function (restaurant) {
        if (text) {
          var hay = [restaurant.name, restaurant.location, restaurant.cuisine, (restaurant.tags || []).join(" ")]
            .join(" ")
            .toLowerCase();
          if (hay.indexOf(text) < 0) return false;
        }
        if (cuisine && normalize(restaurant.cuisine) !== cuisine) return false;
        if (budget && normalize(restaurant.priceBand) !== budget) return false;
        return true;
      });

    var fallback = function () {
      var results = source.map(function (restaurant) {
        var safeMenu = (restaurant.menu || []).filter(function (item) {
          return !intersects(item.allergyTags || [], context.allergies);
        });
        var conflict = (restaurant.menu || []).filter(function (item) {
          return intersects(item.allergyTags || [], context.allergies);
        });
        return {
          restaurant: restaurant,
          safeMenu: safeMenu,
          conflicts: conflict,
          recommendedItems: safeMenu.slice(0, 3),
          reasons: [],
          score: Math.round((restaurant.rating || 4) * 4)
        };
      });
      results.sort(function (a, b) { return b.score - a.score; });
      return results;
    };

    var payload = {
      context: context,
      restaurants: source,
      orderHistory: recommendationHistory(context.group)
    };

    var resolver = (window.recommendationService && window.recommendationService.getRecommendations)
      ? window.recommendationService.getRecommendations(payload)
      : Promise.resolve({ results: fallback() });

    return resolver
      .then(function (response) {
        var results = (response && response.results) || fallback();
        results = results.filter(function (item) {
          return filters.safeOnly ? item.safeMenu.length > 0 : true;
        });
        return { context: context, results: results };
      })
      .catch(function () {
        var results = fallback();
        results = results.filter(function (item) {
          return filters.safeOnly ? item.safeMenu.length > 0 : true;
        });
        return { context: context, results: results };
      });
  }

  function carts() {
    return read(KEYS.carts, []);
  }

  function saveCarts(c) {
    write(KEYS.carts, c);
  }

  function getCart() {
    var current = ensureDiner();
    if (!current) return null;
    return carts().find(function (item) { return item.userId === current.id; }) || null;
  }

  function upsertCart(cart) {
    var current = ensureDiner();
    if (!current) return;
    var all = carts();
    var index = all.findIndex(function (item) { return item.userId === current.id; });
    if (index >= 0) all[index] = cart;
    else all.push(cart);
    saveCarts(all);
  }

  function cartTotals(cart) {
    var subtotal = 0;
    (cart.items || []).forEach(function (item) { subtotal += item.price * item.quantity; });
    var fee = subtotal ? 1.5 : 0;
    return { subtotal: subtotal, serviceFee: fee, total: subtotal + fee };
  }

  function addToCart(restaurantId, menuItemId, groupId) {
    var restaurant = findRestaurant(restaurantId);
    if (!restaurant) return { ok: false, message: "Restaurant not found." };
    var menuItem = (restaurant.menu || []).find(function (item) { return item.id === menuItemId; });
    if (!menuItem) return { ok: false, message: "Menu item not found." };

    var cart = getCart();
    if (!cart || cart.restaurantId !== restaurantId) {
      cart = {
        id: uid("cart"),
        userId: ensureDiner().id,
        restaurantId: restaurantId,
        restaurantName: restaurant.name,
        groupId: groupId || null,
        items: [],
        updatedAt: nowIso()
      };
    }

    var existing = cart.items.find(function (item) { return item.menuItemId === menuItem.id; });
    if (existing) existing.quantity += 1;
    else {
      cart.items.push({
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        allergyTags: menuItem.allergyTags || [],
        quantity: 1
      });
    }

    cart.groupId = groupId || cart.groupId || null;
    cart.updatedAt = nowIso();
    upsertCart(cart);
    return { ok: true, cart: cart };
  }

  function updateCartItem(menuItemId, quantity) {
    var cart = getCart();
    if (!cart) return;
    var item = cart.items.find(function (entry) { return entry.menuItemId === menuItemId; });
    if (!item) return;
    item.quantity = quantity;
    cart.items = cart.items.filter(function (entry) { return entry.quantity > 0; });
    cart.updatedAt = nowIso();
    upsertCart(cart);
  }

  function clearCart() {
    var current = ensureDiner();
    if (!current) return;
    saveCarts(carts().filter(function (item) { return item.userId !== current.id; }));
  }

  function getOrders() {
    var current = ensureDiner();
    if (!current) return [];
    return read(KEYS.orders, [])
      .filter(function (item) { return item.userId === current.id; })
      .sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
  }

  function checkout(payload) {
    var cart = getCart();
    if (!cart || !cart.items.length) return { ok: false, message: "Cart is empty." };
    var totals = cartTotals(cart);
    var all = read(KEYS.orders, []);
    all.push({
      id: uid("order"),
      userId: ensureDiner().id,
      groupId: payload.groupId || cart.groupId || null,
      restaurantId: cart.restaurantId,
      restaurantName: cart.restaurantName,
      items: cart.items,
      notes: payload.notes,
      status: "Placed",
      subtotal: totals.subtotal,
      serviceFee: totals.serviceFee,
      total: totals.total,
      createdAt: nowIso()
    });
    write(KEYS.orders, all);
    clearCart();
    return { ok: true };
  }

  function formatMoney(value) {
    return "$" + Number(value || 0).toFixed(2);
  }

  function formatDate(iso) {
    try { return new Date(iso).toLocaleString(); }
    catch (error) { return iso; }
  }

  function setHtml(id, html) {
    var node = document.getElementById(id);
    if (node) node.innerHTML = html;
  }

  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function param(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function renderChips(values) {
    if (!values || !values.length) return '<span class="chip">None</span>';
    return values.map(function (value) { return '<span class="chip">' + value + "</span>"; }).join("");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderAiRecommendedTags(items, limit) {
    var picks = (items || []).slice(0, Number(limit) || 2);
    if (!picks.length) {
      return '<span class="small-note">No safe picks</span>';
    }
    return '<div class="ai-rec-list">' + picks.map(function (item) {
      var name = escapeHtml(item && item.name ? item.name : item);
      return '<span class="ai-rec-item"><span class="ai-rec-badge">AI Recommended</span><span>' + name + "</span></span>";
    }).join("") + "</div>";
  }

  function navGreeting() {
    var current = ensureDiner();
    if (current) setText("dinerName", current.fullName);
  }

  function fillGroupSelect(id, noneLabel) {
    var select = document.getElementById(id);
    if (!select) return;
    var groups = getGroups();
    var active = getActiveGroup();
    var head = noneLabel ? '<option value="">' + noneLabel + "</option>" : "";
    select.innerHTML = head + groups.map(function (g) {
      var selected = active && active.id === g.id ? " selected" : "";
      return '<option value="' + g.id + '"' + selected + ">" + g.name + "</option>";
    }).join("");
  }

  function fillGroupContextSelect(id) {
    var select = document.getElementById(id);
    if (!select) return;
    var groups = getGroups();
    var active = getActiveGroup();
    var activeLabel = active ? "Use active group (" + active.name + ")" : "Use active group (none selected)";

    select.innerHTML =
      '<option value="' + GROUP_CONTEXT_ACTIVE + '">' + activeLabel + "</option>" +
      '<option value="' + GROUP_CONTEXT_NONE + '">No group context</option>' +
      groups.map(function (group) {
        return '<option value="' + group.id + '">' + group.name + "</option>";
      }).join("");

    select.value = active ? GROUP_CONTEXT_ACTIVE : GROUP_CONTEXT_NONE;
  }

  function initDashboard() {
    navGreeting();
    var current = ensureDiner();
    if (!current) return;
    var profile = getProfile();
    var groups = getGroups();
    var reports = getReports();
    var orders = getOrders();
    var active = getActiveGroup();
    setText("welcomeName", current.fullName);
    setText("metricOrders", String(orders.length));
    setText("metricReports", String(reports.length));
    setText("metricGroups", String(groups.length));
    setText("metricAllergies", String((profile.allergies || []).length));
    setText("activeGroupName", active ? active.name : "None selected");
    setHtml("prefChips", renderChips(profile.favoriteCuisines || []));
    setHtml("allergyChips", renderChips(profile.allergies || []));
    setHtml("dietChips", renderChips(profile.dietPreferences || (profile.dietPreference ? [profile.dietPreference] : [])));
    setText("tasteLevels", "Spice: " + titleCase(profile.spiceLevel || "medium") + " | Sugar: " + titleCase(profile.sugarLevel || "medium"));

    setHtml("recommendList", '<div class="empty">Loading recommendations...</div>');
    searchRestaurants({ searchText: "", cuisine: "", budget: "", safeOnly: true }).then(function (response) {
      var rec = response.results.slice(0, 3);
      if (!rec.length) {
        setHtml("recommendList", '<div class="empty">No recommendations yet.</div>');
        return;
      }
      setHtml("recommendList", '<ul class="list-clean">' + rec.map(function (item) {
        var safe = renderAiRecommendedTags(item.recommendedItems || item.safeMenu || [], 2);
        var why = (item.reasons || []).slice(0, 2).join(", ");
        return "<li><strong>" + item.restaurant.name + "</strong> | " + item.restaurant.cuisine + '<div class="small-note"><strong>Safe picks:</strong></div>' + safe + (why ? '<div class="small-note">Why: ' + why + "</div>" : "") + "</li>";
      }).join("") + "</ul>");
    });

    if (!orders.length) setHtml("recentOrders", '<div class="empty">No orders yet.</div>');
    else {
      setHtml("recentOrders", '<ul class="list-clean">' + orders.slice(0, 4).map(function (order) {
        return "<li><strong>" + order.restaurantName + "</strong> | " + formatMoney(order.total) + '<div class="small-note">' + formatDate(order.createdAt) + "</div></li>";
      }).join("") + "</ul>");
    }
  }

  function initSurvey() {
    navGreeting();
    var profile = getProfile();
    var form = document.getElementById("surveyForm");
    var msg = document.getElementById("surveyMessage");
    if (!form) return;

    var knownAllergyValues = Array.prototype.slice.call(form.querySelectorAll('input[name="allergyOption"]')).map(function (node) {
      return node.value;
    });
    var knownAllergyMap = {};
    knownAllergyValues.forEach(function (value) {
      knownAllergyMap[normalize(value)] = value;
    });

    var dietSelection = Array.isArray(profile.dietPreferences) && profile.dietPreferences.length
      ? profile.dietPreferences
      : (profile.dietPreference ? [profile.dietPreference] : []);
    dietSelection.forEach(function (value) {
      var node = form.querySelector('input[name="dietPreference"][value="' + value + '"]');
      if (node) node.checked = true;
    });

    form.spiceLevel.value = profile.spiceLevel || "medium";
    form.sugarLevel.value = profile.sugarLevel || "medium";
    form.budget.value = profile.budget || "medium";
    form.notes.value = profile.notes || "";
    (profile.favoriteCuisines || []).forEach(function (value) {
      var node = form.querySelector('input[name="favoriteCuisine"][value="' + value + '"]');
      if (node) node.checked = true;
    });
    var customAllergies = [];
    (profile.allergies || []).forEach(function (value) {
      var mapped = knownAllergyMap[normalize(value)];
      if (mapped) {
        var node = form.querySelector('input[name="allergyOption"][value="' + mapped + '"]');
        if (node) node.checked = true;
      } else if (clean(value)) {
        customAllergies.push(value);
      }
    });
    form.customAllergies.value = uniqueValues(customAllergies).join(", ");

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var cuisines = Array.prototype.slice.call(form.querySelectorAll('input[name="favoriteCuisine"]:checked')).map(function (n) {
        return n.value;
      });
      var dietPreferences = Array.prototype.slice.call(form.querySelectorAll('input[name="dietPreference"]:checked')).map(function (n) {
        return n.value;
      });
      var selectedAllergies = Array.prototype.slice.call(form.querySelectorAll('input[name="allergyOption"]:checked')).map(function (n) {
        return titleCase(n.value);
      });
      var customAllergies = csv(form.customAllergies.value).map(function (value) {
        return titleCase(value);
      });
      var allAllergies = uniqueValues(selectedAllergies.concat(customAllergies));

      saveSurvey({
        favoriteCuisines: cuisines,
        allergies: allAllergies,
        dietPreferences: dietPreferences,
        spiceLevel: clean(form.spiceLevel.value),
        sugarLevel: clean(form.sugarLevel.value),
        budget: clean(form.budget.value),
        notes: clean(form.notes.value)
      });
      msg.className = "form-message ok";
      msg.textContent = "Survey saved successfully.";
    });
  }

  function renderReports() {
    var reports = getReports();
    if (!reports.length) {
      setHtml("reportList", '<div class="empty">No medical reports uploaded yet.</div>');
      return;
    }
    setHtml("reportList", '<div class="table-wrap"><table><thead><tr><th>Uploaded</th><th>File</th><th>Extracted Allergies</th><th>Status</th><th>Notes</th></tr></thead><tbody>' +
      reports.map(function (r) {
        return "<tr><td>" + formatDate(r.uploadedAt) + "</td><td>" + r.fileName + "</td><td>" + (r.extractedAllergies.join(", ") || "-") + '</td><td><span class="status soft">' + r.status + "</span></td><td>" + (r.notes || "-") + "</td></tr>";
      }).join("") + "</tbody></table></div>");
  }

  function initMedicalUpload() {
    navGreeting();
    var form = document.getElementById("reportForm");
    var msg = document.getElementById("reportMessage");
    var autoExtractBtn = document.getElementById("autoExtractBtn");
    var autoExtracted = [];
    if (!form) return;
    renderReports();

    function showMessage(type, text) {
      msg.className = "form-message " + type;
      msg.textContent = text;
    }

    function runAutoExtraction() {
      var fileObj = form.reportFile.files && form.reportFile.files[0];
      if (!fileObj) {
        showMessage("error", "Attach a PDF file first to auto read allergies.");
        return;
      }
      if (!/\.pdf$/i.test(fileObj.name || "")) {
        showMessage("error", "Auto read currently supports PDF files.");
        return;
      }
      if (!window.recommendationService || !window.recommendationService.extractAllergiesFromReport) {
        showMessage("error", "AI service module unavailable.");
        return;
      }

      autoExtractBtn.disabled = true;
      showMessage("ok", "Reading PDF and extracting allergies...");

      window.recommendationService.extractAllergiesFromReport(fileObj).then(function (response) {
        var parsed = uniqueValues(((response && response.allergies) || []).map(function (item) {
          return titleCase(item);
        }));
        autoExtracted = parsed;

        var current = csv(form.extractedAllergies.value).map(function (item) {
          return titleCase(item);
        });
        var combined = uniqueValues(current.concat(parsed));
        form.extractedAllergies.value = combined.join(", ");

        var confidence = response && typeof response.confidence === "number" ? response.confidence : 0;
        var detail = parsed.length
          ? "Detected " + parsed.length + " allergy tags (confidence " + Math.round(confidence * 100) + "%)."
          : "No allergy terms detected from this PDF.";
        if (response && response.notes) detail += " " + response.notes;
        showMessage(parsed.length ? "ok" : "error", detail);
      }).catch(function () {
        showMessage("error", "Could not auto read this PDF. You can still enter allergies manually.");
      }).finally(function () {
        autoExtractBtn.disabled = false;
      });
    }

    if (autoExtractBtn) {
      autoExtractBtn.addEventListener("click", runAutoExtraction);
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var file = form.reportFile.files && form.reportFile.files[0] ? form.reportFile.files[0].name : clean(form.reportName.value);
      if (!file) {
        showMessage("error", "Attach a file or provide report name.");
        return;
      }

      var manual = csv(form.extractedAllergies.value).map(function (item) {
        return titleCase(item);
      });
      var extracted = uniqueValues(manual.concat(autoExtracted));

      addReport({
        fileName: file,
        extractedAllergies: extracted,
        notes: clean(form.notes.value)
      });

      if (extracted.length) {
        mergeProfileAllergies(extracted);
      }

      form.reset();
      autoExtracted = [];
      showMessage("ok", "Report uploaded. Allergy profile updated with " + extracted.length + " unique tags.");
      renderReports();
    });
  }

  function initRestaurants() {
    navGreeting();
    seedRestaurants();
    fillGroupContextSelect("groupFilter");

    var cuisine = document.getElementById("cuisineFilter");
    var unique = {};
    getRestaurants().forEach(function (r) { unique[r.cuisine] = true; });
    cuisine.innerHTML = '<option value="">Any cuisine</option>' + Object.keys(unique).sort().map(function (name) {
      return '<option value="' + name + '">' + name + "</option>";
    }).join("");

    var pendingTimer = null;
    var requestCounter = 0;

    function render() {
      var groupId = clean(document.getElementById("groupFilter").value);
      var requestId = ++requestCounter;
      setHtml("restaurantResults", '<div class="empty">Loading recommendations...</div>');
      return searchRestaurants({
        searchText: clean(document.getElementById("searchText").value),
        cuisine: clean(document.getElementById("cuisineFilter").value),
        budget: clean(document.getElementById("budgetFilter").value),
        groupId: groupId,
        safeOnly: document.getElementById("safeOnly").checked
      }).then(function (result) {
        if (requestId !== requestCounter) return;
        setHtml("allergyContext", renderChips(result.context.allergies));
        setHtml("preferenceContext", renderChips(result.context.favoriteCuisines));
        setText("activeGroupBadge", result.context.group ? result.context.group.name : "None");

        if (!result.results.length) {
          setHtml("restaurantResults", '<div class="empty">No restaurants matched your filters.</div>');
          return;
        }

        var groupParam = (groupId && groupId !== GROUP_CONTEXT_ACTIVE && groupId !== GROUP_CONTEXT_NONE)
          ? groupId
          : (result.context.group ? result.context.group.id : "");
        setHtml("restaurantResults", '<div class="restaurant-grid">' + result.results.map(function (entry) {
          var r = entry.restaurant;
          var query = groupParam ? "&group=" + encodeURIComponent(groupParam) : "";
          var picks = renderAiRecommendedTags(entry.recommendedItems || entry.safeMenu || [], 2);
          var why = (entry.reasons || []).slice(0, 2).join(", ");
          return '<article class="card restaurant-card"><h3>' + r.name + '</h3><div class="restaurant-meta"><span class="chip">' + r.cuisine + '</span><span class="chip">' + r.location + '</span><span class="chip">Price: ' + titleCase(r.priceBand) + '</span><span class="chip">Rating ' + r.rating + '</span></div><p>' + r.description + '</p><div class="inline-actions"><span class="' + (entry.safeMenu.length ? "pill-ok" : "pill-warn") + '">' + entry.safeMenu.length + ' safe items</span><span class="' + (entry.conflicts.length ? "pill-warn" : "pill-ok") + '">' + entry.conflicts.length + ' conflict items</span></div><div class="small-note"><strong>What to eat:</strong></div>' + picks + (why ? '<div class="small-note">Why: ' + why + '</div>' : '') + '<div class="split-actions"><a class="btn btn-primary" href="diner-restaurant-detail.html?id=' + r.id + query + '">View Menu</a></div></article>';
        }).join("") + "</div>");
      }).catch(function () {
        if (requestId !== requestCounter) return;
        setHtml("restaurantResults", '<div class="empty">Could not load recommendations right now.</div>');
      });
    }

    function scheduleRender() {
      if (pendingTimer) clearTimeout(pendingTimer);
      pendingTimer = setTimeout(render, 220);
    }

    document.getElementById("searchBtn").addEventListener("click", render);
    document.getElementById("searchText").addEventListener("input", scheduleRender);
    document.getElementById("cuisineFilter").addEventListener("change", render);
    document.getElementById("budgetFilter").addEventListener("change", render);
    document.getElementById("groupFilter").addEventListener("change", render);
    document.getElementById("safeOnly").addEventListener("change", render);
    render();
  }

  function initAiRecommendations() {
    navGreeting();
    seedRestaurants();
    fillGroupContextSelect("aiGroupFilter");

    var cuisine = document.getElementById("aiCuisineFilter");
    var unique = {};
    getRestaurants().forEach(function (r) { unique[r.cuisine] = true; });
    cuisine.innerHTML = '<option value="">Any cuisine</option>' + Object.keys(unique).sort().map(function (name) {
      return '<option value="' + name + '">' + name + "</option>";
    }).join("");

    function renderAi() {
      var groupId = clean(document.getElementById("aiGroupFilter").value);
      setHtml("aiResults", '<div class="empty">Loading AI recommendations...</div>');
      return searchRestaurants({
        searchText: clean(document.getElementById("aiSearchText").value),
        cuisine: clean(document.getElementById("aiCuisineFilter").value),
        budget: clean(document.getElementById("aiBudgetFilter").value),
        groupId: groupId,
        safeOnly: document.getElementById("aiSafeOnly").checked
      }).then(function (result) {
        setHtml("aiAllergyContext", renderChips(result.context.allergies));
        setHtml("aiPreferenceContext", renderChips(result.context.favoriteCuisines));
        setText("aiActiveGroupBadge", result.context.group ? result.context.group.name : "None");

        if (!result.results.length) {
          setHtml("aiResults", '<div class="empty">No AI recommendations found with current filters.</div>');
          return;
        }

        var groupParam = (groupId && groupId !== GROUP_CONTEXT_ACTIVE && groupId !== GROUP_CONTEXT_NONE)
          ? groupId
          : (result.context.group ? result.context.group.id : "");
        setHtml("aiResults", '<div class="restaurant-grid">' + result.results.map(function (entry) {
          var r = entry.restaurant;
          var picks = renderAiRecommendedTags(entry.recommendedItems || entry.safeMenu || [], 3);
          var why = (entry.reasons || []).join(", ");
          var query = groupParam ? "&group=" + encodeURIComponent(groupParam) : "";
          return '<article class="card restaurant-card"><h3>' + r.name + '</h3><div class="restaurant-meta"><span class="chip">' + r.cuisine + '</span><span class="chip">' + r.location + '</span><span class="chip">Price: ' + titleCase(r.priceBand) + '</span><span class="chip">Score ' + entry.score + '</span></div><p>' + r.description + '</p><div class="small-note"><strong>What to eat:</strong></div>' + picks + '<div class="small-note"><strong>Why suggested:</strong> ' + (why || "General safe match") + '</div><div class="inline-actions"><span class="' + (entry.safeMenu.length ? "pill-ok" : "pill-warn") + '">' + entry.safeMenu.length + ' safe items</span><span class="' + (entry.conflicts.length ? "pill-warn" : "pill-ok") + '">' + entry.conflicts.length + ' conflict items</span></div><div class="split-actions"><a class="btn btn-primary" href="diner-restaurant-detail.html?id=' + r.id + query + '">Open Menu</a><a class="btn btn-secondary" href="diner-restaurants.html">Back To Search</a></div></article>';
        }).join("") + "</div>");
      });
    }

    document.getElementById("aiRunBtn").addEventListener("click", renderAi);
    renderAi();
  }

  function initRestaurantDetail() {
    navGreeting();
    var id = param("id");
    if (!id) {
      setHtml("menuContainer", '<div class="empty">Missing restaurant id.</div>');
      return;
    }

    var restaurant = findRestaurant(id);
    if (!restaurant) {
      setHtml("menuContainer", '<div class="empty">Restaurant not found.</div>');
      return;
    }

    setText("restaurantName", restaurant.name);
    setText("restaurantMeta", restaurant.cuisine + " | " + restaurant.location + " | " + titleCase(restaurant.priceBand));
    setText("restaurantDescription", restaurant.description);

    fillGroupSelect("groupPick", "Solo dining");
    var fromQuery = clean(param("group"));
    if (fromQuery) document.getElementById("groupPick").value = fromQuery;

    function renderMenu() {
      var context = combinedContext(clean(document.getElementById("groupPick").value));
      setHtml("allergyContext", renderChips(context.allergies));

      setHtml("menuContainer", '<div class="table-wrap"><table><thead><tr><th>Item</th><th>Ingredients</th><th>Allergy Tags</th><th>Price</th><th>Action</th></tr></thead><tbody>' + restaurant.menu.map(function (item) {
        var blocked = intersects(item.allergyTags || [], context.allergies || []);
        var action = blocked
          ? '<span class="pill-warn">Blocked by allergy context</span>'
          : '<button class="btn btn-primary add-btn" data-id="' + item.id + '">Add</button>';
        return "<tr><td><strong>" + item.name + "</strong></td><td>" + item.ingredients + "</td><td>" + ((item.allergyTags || []).join(", ") || "None") + "</td><td>" + formatMoney(item.price) + "</td><td>" + action + "</td></tr>";
      }).join("") + "</tbody></table></div>");

      Array.prototype.slice.call(document.querySelectorAll(".add-btn")).forEach(function (button) {
        button.addEventListener("click", function () {
          var result = addToCart(restaurant.id, button.getAttribute("data-id"), clean(document.getElementById("groupPick").value));
          var msg = document.getElementById("detailMessage");
          if (!result.ok) {
            msg.className = "form-message error";
            msg.textContent = result.message;
            return;
          }
          msg.className = "form-message ok";
          msg.textContent = "Added to cart.";
          renderCartSnapshot();
        });
      });
    }

    function renderCartSnapshot() {
      var cart = getCart();
      if (!cart || !cart.items.length) {
        setHtml("cartSnapshot", '<div class="empty">Cart is empty.</div>');
        return;
      }
      var totals = cartTotals(cart);
      setHtml("cartSnapshot", "<div><strong>" + cart.items.length + "</strong> items in cart | Total " + formatMoney(totals.total) + '</div><div class="split-actions"><a class="btn btn-secondary" href="diner-cart-checkout.html">Open Cart & Checkout</a></div>');
    }

    document.getElementById("groupPick").addEventListener("change", renderMenu);
    renderMenu();
    renderCartSnapshot();
  }

  function initCartCheckout() {
    navGreeting();
    fillGroupSelect("checkoutGroup", "Solo dining");

    function render() {
      var cart = getCart();
      if (!cart || !cart.items.length) {
        setHtml("cartTable", '<div class="empty">Your cart is empty. Add items from <a href="diner-restaurants.html">restaurants</a>.</div>');
        setText("cartRestaurant", "-");
        setText("checkoutSubtotal", "$0.00");
        setText("checkoutFee", "$0.00");
        setText("checkoutTotal", "$0.00");
        return;
      }

      setText("cartRestaurant", cart.restaurantName);
      if (cart.groupId) document.getElementById("checkoutGroup").value = cart.groupId;
      var totals = cartTotals(cart);
      setText("checkoutSubtotal", formatMoney(totals.subtotal));
      setText("checkoutFee", formatMoney(totals.serviceFee));
      setText("checkoutTotal", formatMoney(totals.total));

      setHtml("cartTable", '<div class="table-wrap"><table><thead><tr><th>Item</th><th>Price</th><th>Quantity</th><th>Allergy Tags</th><th></th></tr></thead><tbody>' + cart.items.map(function (item) {
        return '<tr><td><strong>' + item.name + '</strong></td><td>' + formatMoney(item.price) + '</td><td><div class="qty-control"><button type="button" class="qty-btn" data-id="' + item.menuItemId + '" data-dir="-1">-</button><span>' + item.quantity + '</span><button type="button" class="qty-btn" data-id="' + item.menuItemId + '" data-dir="1">+</button></div></td><td>' + ((item.allergyTags || []).join(", ") || "None") + '</td><td><button type="button" class="btn btn-secondary rm-btn" data-id="' + item.menuItemId + '">Remove</button></td></tr>';
      }).join("") + "</tbody></table></div>");

      Array.prototype.slice.call(document.querySelectorAll(".qty-btn")).forEach(function (button) {
        button.addEventListener("click", function () {
          var latest = getCart();
          if (!latest) return;
          var item = latest.items.find(function (e) { return e.menuItemId === button.getAttribute("data-id"); });
          if (!item) return;
          updateCartItem(item.menuItemId, item.quantity + Number(button.getAttribute("data-dir")));
          render();
        });
      });
      Array.prototype.slice.call(document.querySelectorAll(".rm-btn")).forEach(function (button) {
        button.addEventListener("click", function () {
          updateCartItem(button.getAttribute("data-id"), 0);
          render();
        });
      });
    }

    document.getElementById("checkoutBtn").addEventListener("click", function () {
      var result = checkout({
        groupId: clean(document.getElementById("checkoutGroup").value),
        notes: clean(document.getElementById("checkoutNotes").value)
      });
      var msg = document.getElementById("checkoutMessage");
      if (!result.ok) {
        msg.className = "form-message error";
        msg.textContent = result.message;
        return;
      }
      msg.className = "form-message ok";
      msg.textContent = "Order placed successfully.";
      render();
      setTimeout(function () { window.location.href = "diner-order-history.html"; }, 650);
    });

    render();
  }

  function initGroups() {
    navGreeting();
    var draftUserIds = [];
    var msg = document.getElementById("groupMessage");
    var lookupForm = document.getElementById("memberLookupForm");
    var lookupInput = document.getElementById("memberLookup");
    var lookupResults = document.getElementById("lookupResults");
    var groupForm = document.getElementById("groupForm");
    var recommendationSelect = document.getElementById("groupRecommendationSelect");
    var editGroupSelect = document.getElementById("editGroupSelect");
    var editMemberLookupForm = document.getElementById("editMemberLookupForm");
    var editMemberLookup = document.getElementById("editMemberLookup");
    var editLookupResults = document.getElementById("editLookupResults");
    var editGroupMembers = document.getElementById("editGroupMembers");
    var editGroupMessage = document.getElementById("editGroupMessage");

    function setEditMessage(type, text) {
      if (!editGroupMessage) return;
      editGroupMessage.className = "form-message " + type;
      editGroupMessage.textContent = text;
    }

    function groupRecommendations(groupId) {
      if (!groupId) {
        setHtml("groupRecommendations", '<div class="empty">Select a group to view combined recommendations.</div>');
        return;
      }
      setHtml("groupRecommendations", '<div class="empty">Loading group recommendations...</div>');
      searchRestaurants({
        searchText: "",
        cuisine: "",
        budget: "",
        groupId: groupId,
        safeOnly: true
      }).then(function (result) {
        if (!result.results.length) {
          setHtml("groupRecommendations", '<div class="empty">No safe recommendations found for this group yet.</div>');
          return;
        }

        setHtml("groupRecommendations", '<ul class="list-clean">' + result.results.slice(0, 5).map(function (entry) {
          var picks = renderAiRecommendedTags(entry.recommendedItems || entry.safeMenu || [], 2);
          var why = (entry.reasons || []).slice(0, 2).join(", ");
          return '<li><strong>' + entry.restaurant.name + '</strong> | ' + entry.restaurant.cuisine + '<div class="small-note"><strong>What to eat:</strong></div>' + picks + (why ? '<div class="small-note">Why: ' + why + "</div>" : "") + '</li>';
        }).join("") + "</ul>");
      });
    }

    function currentEditGroup() {
      if (!editGroupSelect) return null;
      var groupId = clean(editGroupSelect.value);
      if (!groupId) return null;
      return getGroups().find(function (item) { return item.id === groupId; }) || null;
    }

    function renderEditGroupSelect(preferredGroupId) {
      if (!editGroupSelect) return;
      var groups = getGroups();
      editGroupSelect.innerHTML =
        '<option value="">Select group</option>' +
        groups.map(function (group) {
          return '<option value="' + group.id + '">' + group.name + "</option>";
        }).join("");

      var active = getActiveGroup();
      var target = preferredGroupId || (active && active.id) || (groups[0] && groups[0].id) || "";
      editGroupSelect.value = target || "";
      renderEditableMembers();
      renderEditLookupResults();
    }

    function renderEditableMembers() {
      if (!editGroupMembers) return;
      var group = currentEditGroup();
      if (!group) {
        setHtml("editGroupMembers", '<div class="empty">Select a group to edit members.</div>');
        return;
      }

      setHtml("editGroupMembers", '<ul class="list-clean">' + (group.members || []).map(function (member) {
        return '<li><strong>@' + (member.username || "user") + '</strong> | ' + member.name + '<div class="small-note">Phone: ' + (member.phone || "-") + '</div><div class="small-note">Allergies: ' + ((member.allergies || []).join(", ") || "None") + '</div><div class="split-actions"><button class="btn btn-secondary edit-rm-member" data-id="' + member.userId + '">Remove</button></div></li>';
      }).join("") + "</ul>");

      Array.prototype.slice.call(document.querySelectorAll(".edit-rm-member")).forEach(function (button) {
        button.addEventListener("click", function () {
          var selectedGroup = currentEditGroup();
          if (!selectedGroup) return;
          var result = removeMemberFromGroup(selectedGroup.id, button.getAttribute("data-id"));
          if (!result.ok) {
            setEditMessage("error", result.message);
            return;
          }
          setEditMessage("ok", "Member removed from group.");
          renderGroups();
          renderRecommendationSelect();
          renderEditGroupSelect(selectedGroup.id);
          groupRecommendations(clean(recommendationSelect.value || selectedGroup.id));
        });
      });
    }

    function renderEditLookupResults() {
      if (!editLookupResults || !editMemberLookup) return;
      var selectedGroup = currentEditGroup();
      if (!selectedGroup) {
        setHtml("editLookupResults", '<div class="empty">Select a group first to add members.</div>');
        return;
      }

      var term = clean(editMemberLookup.value);
      if (!term) {
        setHtml("editLookupResults", '<div class="empty">Search by username or phone to add members.</div>');
        return;
      }

      var existingIds = selectedGroup.memberUserIds || [];
      var found = searchDinersByIdentifier(term, existingIds);
      if (!found.length) {
        setHtml("editLookupResults", '<div class="empty">No additional diner found for this term.</div>');
        return;
      }

      setHtml("editLookupResults", '<ul class="list-clean">' + found.map(function (member) {
        return '<li><strong>@' + (member.username || "user") + '</strong> | ' + member.name + '<div class="small-note">Phone: ' + (member.phone || "-") + '</div><div class="small-note">Allergies: ' + ((member.allergies || []).join(", ") || "None") + '</div><div class="split-actions"><button class="btn btn-secondary edit-add-member" data-id="' + member.userId + '">Add To Group</button></div></li>';
      }).join("") + "</ul>");

      Array.prototype.slice.call(document.querySelectorAll(".edit-add-member")).forEach(function (button) {
        button.addEventListener("click", function () {
          var group = currentEditGroup();
          if (!group) return;
          var result = addMemberToGroup(group.id, button.getAttribute("data-id"));
          if (!result.ok) {
            setEditMessage("error", result.message);
            return;
          }
          setEditMessage("ok", "Member added to group.");
          renderGroups();
          renderRecommendationSelect();
          renderEditGroupSelect(group.id);
          groupRecommendations(clean(recommendationSelect.value || group.id));
        });
      });
    }

    function renderLookupResults() {
      var term = clean(lookupInput.value);
      if (!term) {
        setHtml("lookupResults", '<div class="empty">Search by username or phone to add members.</div>');
        return;
      }

      var found = searchDinersByIdentifier(term, draftUserIds);
      if (!found.length) {
        setHtml("lookupResults", '<div class="empty">No diner found. Ask your friend to sign up and complete profile.</div>');
        return;
      }

      setHtml("lookupResults", '<ul class="list-clean">' + found.map(function (item) {
        return '<li><strong>@' + (item.username || "user") + '</strong> | ' + item.name + '<div class="small-note">Phone: ' + (item.phone || "-") + '</div><div class="small-note">Allergies: ' + ((item.allergies || []).join(", ") || "None") + '</div><div class="split-actions"><button class="btn btn-secondary add-member" data-id="' + item.userId + '">Add To Draft</button></div></li>';
      }).join("") + "</ul>");

      Array.prototype.slice.call(document.querySelectorAll(".add-member")).forEach(function (button) {
        button.addEventListener("click", function () {
          var memberId = button.getAttribute("data-id");
          if (draftUserIds.indexOf(memberId) >= 0) {
            msg.className = "form-message error";
            msg.textContent = "Member already added.";
            return;
          }
          draftUserIds.push(memberId);
          msg.className = "form-message ok";
          msg.textContent = "Member added to draft group.";
          renderDraft();
          renderLookupResults();
        });
      });
    }

    function renderDraft() {
      if (!draftUserIds.length) {
        setHtml("draftMembers", '<div class="empty">No members added yet.</div>');
        return;
      }

      var members = draftUserIds.map(function (userId) {
        var item = getUserById(userId);
        return item && item.role === "diner" ? snapshotMemberFromUser(item) : null;
      }).filter(Boolean);

      setHtml("draftMembers", '<ul class="list-clean">' + members.map(function (item) {
        return '<li><strong>@' + (item.username || "user") + '</strong> | ' + item.name + '<div class="small-note">Phone: ' + (item.phone || "-") + '</div><div class="small-note">Allergies: ' + ((item.allergies || []).join(", ") || "None") + '</div><div class="small-note">Preferences: ' + ((item.preferences || []).join(", ") || "None") + '</div><div class="split-actions"><button class="btn btn-secondary draft-rm" data-id="' + item.userId + '">Remove</button></div></li>';
      }).join("") + "</ul>");

      Array.prototype.slice.call(document.querySelectorAll(".draft-rm")).forEach(function (button) {
        button.addEventListener("click", function () {
          var memberId = button.getAttribute("data-id");
          draftUserIds = draftUserIds.filter(function (userId) { return userId !== memberId; });
          renderDraft();
          renderLookupResults();
        });
      });
    }

    function renderGroups() {
      var groups = getGroups();
      var active = getActiveGroup();
      if (!groups.length) {
        setHtml("savedGroups", '<div class="empty">No dining groups created yet.</div>');
        return;
      }
      setHtml("savedGroups", '<div class="stack">' + groups.map(function (group) {
        var activeBadge = active && active.id === group.id ? ' <span class="status soft">Active</span>' : "";
        var usernames = (group.members || []).map(function (member) {
          return "@" + (member.username || member.name || "member");
        }).join(", ");
        return '<article class="card panel"><h3>' + group.name + activeBadge + '</h3><p>Members: ' + group.members.length + '</p><div class="small-note">Usernames: ' + (usernames || "-") + '</div><div class="small-note">Combined Allergies: ' + (group.groupAllergies.join(", ") || "None") + '</div><div class="small-note">Combined Preferences: ' + (group.groupPreferences.join(", ") || "None") + '</div><div class="split-actions"><button class="btn btn-secondary set-active" data-id="' + group.id + '">Set Active</button><button class="btn btn-secondary quick-rec" data-id="' + group.id + '">View Recommendations</button><button class="btn btn-secondary edit-group" data-id="' + group.id + '">Edit Members</button><button class="btn btn-secondary del-group" data-id="' + group.id + '">Delete</button></div></article>';
      }).join("") + "</div>");

      Array.prototype.slice.call(document.querySelectorAll(".set-active")).forEach(function (button) {
        button.addEventListener("click", function () {
          setActiveGroup(button.getAttribute("data-id"));
          renderGroups();
          recommendationSelect.value = button.getAttribute("data-id");
          groupRecommendations(button.getAttribute("data-id"));
        });
      });
      Array.prototype.slice.call(document.querySelectorAll(".quick-rec")).forEach(function (button) {
        button.addEventListener("click", function () {
          recommendationSelect.value = button.getAttribute("data-id");
          groupRecommendations(button.getAttribute("data-id"));
        });
      });
      Array.prototype.slice.call(document.querySelectorAll(".edit-group")).forEach(function (button) {
        button.addEventListener("click", function () {
          var groupId = button.getAttribute("data-id");
          if (editGroupSelect) {
            editGroupSelect.value = groupId;
            renderEditableMembers();
            renderEditLookupResults();
          }
        });
      });
      Array.prototype.slice.call(document.querySelectorAll(".del-group")).forEach(function (button) {
        button.addEventListener("click", function () {
          deleteGroup(button.getAttribute("data-id"));
          renderGroups();
          renderRecommendationSelect();
          renderEditGroupSelect();
        });
      });
    }

    function renderRecommendationSelect() {
      var groups = getGroups();
      recommendationSelect.innerHTML =
        '<option value="">Select group</option>' +
        groups.map(function (group) {
          return '<option value="' + group.id + '">' + group.name + "</option>";
        }).join("");

      var active = getActiveGroup();
      if (active) {
        recommendationSelect.value = active.id;
        groupRecommendations(active.id);
      } else if (groups.length) {
        recommendationSelect.value = groups[0].id;
        groupRecommendations(groups[0].id);
      } else {
        groupRecommendations("");
      }
    }

    lookupForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var found = searchDinersByIdentifier(clean(lookupInput.value), draftUserIds);
      if (!found.length) {
        msg.className = "form-message error";
        msg.textContent = "No matching diner found.";
        return;
      }

      var first = found[0];
      if (draftUserIds.indexOf(first.userId) >= 0) {
        msg.className = "form-message error";
        msg.textContent = "Member already added.";
        return;
      }
      draftUserIds.push(first.userId);
      msg.className = "form-message ok";
      msg.textContent = "Member added to draft group.";
      renderDraft();
      renderLookupResults();
    });

    groupForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var name = clean(groupForm.groupName.value);
      if (!name) {
        msg.className = "form-message error";
        msg.textContent = "Group name is required.";
        return;
      }
      if (!draftUserIds.length) {
        msg.className = "form-message error";
        msg.textContent = "Add at least one registered member first.";
        return;
      }
      var result = createGroup({ name: name, memberUserIds: draftUserIds });
      if (!result.ok) {
        msg.className = "form-message error";
        msg.textContent = result.message;
        return;
      }
      draftUserIds = [];
      lookupForm.reset();
      groupForm.reset();
      msg.className = "form-message ok";
      msg.textContent = "Group created successfully.";
      renderDraft();
      renderLookupResults();
      renderGroups();
      renderRecommendationSelect();
      renderEditGroupSelect(result.group ? result.group.id : "");
    });

    lookupInput.addEventListener("input", renderLookupResults);
    recommendationSelect.addEventListener("change", function () {
      groupRecommendations(clean(recommendationSelect.value));
    });
    if (editGroupSelect) {
      editGroupSelect.addEventListener("change", function () {
        renderEditableMembers();
        renderEditLookupResults();
      });
    }
    if (editMemberLookup) {
      editMemberLookup.addEventListener("input", renderEditLookupResults);
    }
    if (editMemberLookupForm) {
      editMemberLookupForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var group = currentEditGroup();
        if (!group) {
          setEditMessage("error", "Select a group first.");
          return;
        }
        var term = clean(editMemberLookup.value);
        var found = searchDinersByIdentifier(term, group.memberUserIds || []);
        if (!found.length) {
          setEditMessage("error", "No matching diner found.");
          return;
        }
        var result = addMemberToGroup(group.id, found[0].userId);
        if (!result.ok) {
          setEditMessage("error", result.message);
          return;
        }
        setEditMessage("ok", "Member added to group.");
        renderGroups();
        renderRecommendationSelect();
        renderEditGroupSelect(group.id);
        groupRecommendations(clean(recommendationSelect.value || group.id));
      });
    }

    renderDraft();
    renderLookupResults();
    renderGroups();
    renderRecommendationSelect();
    renderEditGroupSelect();
  }

  function initOrderHistory() {
    navGreeting();
    var orders = getOrders();
    if (!orders.length) {
      setHtml("orderHistory", '<div class="empty">No orders found.</div>');
      return;
    }
    setHtml("orderHistory", '<div class="table-wrap"><table><thead><tr><th>Order</th><th>Date</th><th>Restaurant</th><th>Items</th><th>Type</th><th>Status</th><th>Total</th></tr></thead><tbody>' + orders.map(function (order) {
      var items = order.items.map(function (it) { return it.name + " x" + it.quantity; }).join(", ");
      return "<tr><td>" + order.id + "</td><td>" + formatDate(order.createdAt) + "</td><td>" + order.restaurantName + "</td><td>" + items + "</td><td>" + (order.groupId ? "Group" : "Solo") + '</td><td><span class="status soft">' + order.status + "</span></td><td>" + formatMoney(order.total) + "</td></tr>";
    }).join("") + "</tbody></table></div>");
  }

  function initProfile() {
    navGreeting();
    var current = ensureDiner();
    if (!current) return;
    var profile = getProfile();
    var form = document.getElementById("profileForm");
    var msg = document.getElementById("profileMessage");

    form.fullName.value = current.fullName || "";
    if (form.username) form.username.value = current.username || "";
    form.email.value = current.email || "";
    form.phone.value = current.phone || "";
    form.address.value = profile.address || "";
    form.emergencyContact.value = profile.emergencyContact || "";
    form.allergiesView.value = (profile.allergies || []).join(", ");
    form.preferencesView.value = (profile.favoriteCuisines || []).join(", ");

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      saveProfile({
        fullName: clean(form.fullName.value),
        phone: clean(form.phone.value),
        address: clean(form.address.value),
        emergencyContact: clean(form.emergencyContact.value)
      });
      msg.className = "form-message ok";
      msg.textContent = "Profile updated successfully.";
      navGreeting();
    });
  }

  window.dinerPortal = {
    initDashboard: initDashboard,
    initSurvey: initSurvey,
    initMedicalUpload: initMedicalUpload,
    initRestaurants: initRestaurants,
    initAiRecommendations: initAiRecommendations,
    initRestaurantDetail: initRestaurantDetail,
    initCartCheckout: initCartCheckout,
    initGroups: initGroups,
    initOrderHistory: initOrderHistory,
    initProfile: initProfile
  };
})();
