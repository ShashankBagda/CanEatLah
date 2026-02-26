(function () {
  var KEYS = {
    users: "can_eat_lah_users",
    session: "can_eat_lah_session"
  };

  var DATA_KEYS = {
    restaurants: "can_eat_lah_restaurants",
    reports: "can_eat_lah_medical_reports",
    groups: "can_eat_lah_groups",
    orders: "can_eat_lah_orders",
    carts: "can_eat_lah_carts",
    activeGroups: "can_eat_lah_active_groups",
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

  function write(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function clean(value) {
    return (value || "").trim();
  }

  function normalize(value) {
    return clean(value).toLowerCase();
  }

  function uniqueStrings(values) {
    var seen = {};
    var output = [];
    (values || []).forEach(function (value) {
      var key = normalize(value);
      if (!key || seen[key]) return;
      seen[key] = true;
      output.push(clean(value));
    });
    return output;
  }

  function nowWithOffset(dayOffset, hourOffset) {
    var days = Number(dayOffset || 0);
    var hours = Number(hourOffset || 0);
    return new Date(Date.now() + ((days * 24 + hours) * 60 * 60 * 1000)).toISOString();
  }

  function toId(prefix, idx) {
    var number = String(idx);
    while (number.length < 3) number = "0" + number;
    return prefix + "_" + number;
  }

  function getUsers() {
    return read(KEYS.users, []);
  }

  function saveUsers(users) {
    write(KEYS.users, users);
  }

  function getSession() {
    return read(KEYS.session, null);
  }

  function saveSession(session) {
    if (!session) {
      localStorage.removeItem(KEYS.session);
      return;
    }
    write(KEYS.session, session);
  }

  function ensureDinerProfile(profile) {
    var p = profile || {};
    p.favoriteCuisines = Array.isArray(p.favoriteCuisines) ? p.favoriteCuisines : [];
    p.allergies = Array.isArray(p.allergies) ? p.allergies : [];
    p.dietPreferences = Array.isArray(p.dietPreferences) ? p.dietPreferences : [];
    p.dietPreference = clean(p.dietPreference || p.dietPreferences[0] || "");
    p.spiceLevel = clean(p.spiceLevel || "medium");
    p.sugarLevel = clean(p.sugarLevel || "medium");
    p.budget = clean(p.budget || "medium");
    p.notes = clean(p.notes || "");
    p.address = clean(p.address || "");
    p.emergencyContact = clean(p.emergencyContact || "");
    return p;
  }

  function ensureRestaurantProfile(data, fallbackName) {
    var info = data || {};
    info.name = clean(info.name || fallbackName || "Restaurant");
    info.cuisine = clean(info.cuisine || "Multi Cuisine");
    info.location = clean(info.location || "Downtown");
    info.description = clean(info.description || "Owner managed restaurant profile.");
    info.priceBand = clean(info.priceBand || "medium");
    return info;
  }

  function findUser(users, id, email) {
    var normalizedEmail = normalize(email);
    return users.find(function (item) {
      return item.id === id || normalize(item.email) === normalizedEmail;
    }) || null;
  }

  function upsertById(list, item) {
    if (list.some(function (entry) { return entry.id === item.id; })) return false;
    list.push(item);
    return true;
  }

  function seedBaseUsers() {
    var users = getUsers();
    if (users.length) return;

    users = [
      {
        id: "diner_demo_1",
        role: "diner",
        fullName: "Demo Diner",
        username: "demodiner",
        email: "diner@caneatlah.local",
        phone: "9001000001",
        password: "Pass@123",
        verifiedStatus: "Approved",
        profile: ensureDinerProfile({
          favoriteCuisines: ["Healthy", "Indian", "Japanese"],
          allergies: ["Peanut", "Shellfish"],
          dietPreferences: ["High Protein", "Low Carb"],
          spiceLevel: "medium",
          sugarLevel: "low",
          budget: "medium"
        }),
        createdAt: nowWithOffset(-120)
      },
      {
        id: "owner_demo_1",
        role: "restaurant",
        fullName: "Demo Restaurant Owner",
        username: "demorestaurant",
        email: "restaurant@caneatlah.local",
        phone: "9101000001",
        password: "Pass@123",
        verifiedStatus: "Approved",
        restaurant: ensureRestaurantProfile({
          name: "Demo Kitchen",
          cuisine: "Fusion",
          location: "Downtown",
          description: "Balanced bowls and grills for allergy-aware dining.",
          priceBand: "medium"
        }),
        createdAt: nowWithOffset(-150)
      },
      {
        id: "admin_demo_1",
        role: "admin",
        fullName: "Platform Admin",
        username: "platformadmin",
        email: "admin@caneatlah.local",
        phone: "9201000001",
        password: "Pass@123",
        verifiedStatus: "Approved",
        createdAt: nowWithOffset(-220)
      }
    ];

    saveUsers(users);
  }

  function seedDemoUsers() {
    var users = getUsers();
    var changed = false;

    function addIfMissing(user) {
      if (findUser(users, user.id, user.email)) return;
      users.push(user);
      changed = true;
    }

    addIfMissing({
      id: "diner_demo_1",
      role: "diner",
      fullName: "Demo Diner",
      username: "demodiner",
      email: "diner@caneatlah.local",
      phone: "9001000001",
      password: "Pass@123",
      verifiedStatus: "Approved",
      profile: ensureDinerProfile({
        favoriteCuisines: ["Healthy", "Indian", "Japanese"],
        allergies: ["Peanut", "Shellfish"],
        dietPreferences: ["High Protein", "Low Carb"],
        spiceLevel: "medium",
        sugarLevel: "low",
        budget: "medium"
      }),
      createdAt: nowWithOffset(-120)
    });

    addIfMissing({
      id: "owner_demo_1",
      role: "restaurant",
      fullName: "Demo Restaurant Owner",
      username: "demorestaurant",
      email: "restaurant@caneatlah.local",
      phone: "9101000001",
      password: "Pass@123",
      verifiedStatus: "Approved",
      restaurant: ensureRestaurantProfile({
        name: "Demo Kitchen",
        cuisine: "Fusion",
        location: "Downtown",
        description: "Balanced bowls and grills for allergy-aware dining.",
        priceBand: "medium"
      }),
      createdAt: nowWithOffset(-150)
    });

    addIfMissing({
      id: "admin_demo_1",
      role: "admin",
      fullName: "Platform Admin",
      username: "platformadmin",
      email: "admin@caneatlah.local",
      phone: "9201000001",
      password: "Pass@123",
      verifiedStatus: "Approved",
      createdAt: nowWithOffset(-220)
    });

    var dinerSeeds = [
      ["diner_demo_2", "Maya Tan", "mayatan", "maya@caneatlah.local", "9001000002", ["Vegan", "Thai", "Italian"], ["Dairy", "Egg"], ["Vegan", "Dairy Free"], "high", "none", "low"],
      ["diner_demo_3", "Rahul Verma", "rahulv", "rahul@caneatlah.local", "9001000003", ["Indian", "Mexican", "Healthy"], ["Gluten"], ["High Protein"], "high", "medium", "medium"],
      ["diner_demo_4", "Priya Shah", "priyashah", "priya@caneatlah.local", "9001000004", ["Japanese", "Seafood"], ["Soy", "Sesame"], ["Pescatarian"], "low", "low", "high"],
      ["diner_demo_5", "Ethan Cole", "ethancole", "ethan@caneatlah.local", "9001000005", ["Italian", "Healthy", "Mexican"], ["Tree Nut"], ["Low Carb"], "medium", "none", "medium"],
      ["diner_demo_6", "Noor Hassan", "noorh", "noor@caneatlah.local", "9001000006", ["Indian", "Vegan", "Thai"], ["Mustard", "Celery"], ["Vegetarian", "Jain"], "medium", "low", "low"],
      ["diner_demo_7", "Sofia Kim", "sofiak", "sofia@caneatlah.local", "9001000007", ["Japanese", "Healthy"], ["Fish"], ["Gluten Free"], "high", "medium", "high"],
      ["diner_demo_8", "Liam Parker", "liamp", "liam@caneatlah.local", "9001000008", ["Seafood", "Italian", "Mexican"], ["Shellfish", "Dairy"], ["Pescatarian"], "low", "none", "high"]
    ];

    dinerSeeds.forEach(function (seed, idx) {
      if (findUser(users, seed[0], seed[3])) return;
      users.push({
        id: seed[0],
        role: "diner",
        fullName: seed[1],
        username: seed[2],
        email: seed[3],
        phone: seed[4],
        password: "Pass@123",
        verifiedStatus: idx === 5 ? "Rejected" : (idx === 2 ? "Pending" : "Approved"),
        profile: ensureDinerProfile({
          favoriteCuisines: seed[5],
          allergies: seed[6],
          dietPreferences: seed[7],
          spiceLevel: seed[8],
          sugarLevel: seed[9],
          budget: seed[10],
          notes: "Demo dietary profile"
        }),
        createdAt: nowWithOffset(-100 + idx)
      });
      changed = true;
    });

    var ownerSeeds = [
      ["owner_demo_2", "Arjun Patel", "arjunpatel", "arjun.owner@caneatlah.local", "9101000002", "Spice Terminal", "Indian", "Midtown", "medium", "Pending"],
      ["owner_demo_3", "Mei Lin", "meilin", "mei.owner@caneatlah.local", "9101000003", "Sakura Table", "Japanese", "Harborfront", "high", "Approved"],
      ["owner_demo_4", "Carlos Rivera", "carlosrivera", "carlos.owner@caneatlah.local", "9101000004", "Harvest Bistro", "Continental", "West End", "high", "Approved"]
    ];

    ownerSeeds.forEach(function (seed, idx) {
      if (findUser(users, seed[0], seed[3])) return;
      users.push({
        id: seed[0],
        role: "restaurant",
        fullName: seed[1],
        username: seed[2],
        email: seed[3],
        phone: seed[4],
        password: "Pass@123",
        verifiedStatus: seed[9],
        restaurant: ensureRestaurantProfile({
          name: seed[5],
          cuisine: seed[6],
          location: seed[7],
          priceBand: seed[8],
          description: "Demo restaurant profile"
        }),
        createdAt: nowWithOffset(-90 + idx)
      });
      changed = true;
    });

    if (!findUser(users, "admin_demo_2", "ops.admin@caneatlah.local")) {
      users.push({
        id: "admin_demo_2",
        role: "admin",
        fullName: "Ops Admin",
        username: "opsadmin",
        email: "ops.admin@caneatlah.local",
        phone: "9201000002",
        password: "Pass@123",
        verifiedStatus: "Approved",
        createdAt: nowWithOffset(-180)
      });
      changed = true;
    }

    users.forEach(function (user) {
      user.username = clean(user.username || normalize((user.email || "user").split("@")[0]).replace(/[^a-z0-9_.-]/g, ""));
      user.phone = clean(user.phone || "").replace(/[^0-9]/g, "");
      user.verifiedStatus = clean(user.verifiedStatus || (user.role === "admin" ? "Approved" : "Pending"));
      if (user.role === "diner") user.profile = ensureDinerProfile(user.profile);
      if (user.role === "restaurant") user.restaurant = ensureRestaurantProfile(user.restaurant, user.fullName + " Kitchen");
      if (!user.createdAt) user.createdAt = nowWithOffset(-60);
    });

    if (changed) saveUsers(users);
    else saveUsers(users);
  }

  function seedDemoRestaurants() {
    var users = getUsers();
    var restaurants = read(DATA_KEYS.restaurants, []);
    var map = {};
    restaurants.forEach(function (restaurant) {
      map[restaurant.id] = restaurant;
    });

    var templates = [
      { id: "res_garden_bowl", ownerId: "", name: "Garden Bowl Kitchen", cuisine: "Healthy", location: "Downtown", rating: 4.7, priceBand: "medium", verificationStatus: "Approved", menu: [["gb_1", "Herb Chicken Bowl", 14.5, [], ["high-protein"]], ["gb_2", "Peanut Crunch Salad", 12.8, ["peanut", "sesame"], ["salad"]], ["gb_3", "Tofu Power Plate", 13.2, ["soy"], ["vegan"]]] },
      { id: "res_blue_harbor", ownerId: "", name: "Blue Harbor Grill", cuisine: "Seafood", location: "Riverfront", rating: 4.5, priceBand: "high", verificationStatus: "Pending", menu: [["bh_1", "Grilled Salmon Plate", 19.5, ["fish", "dairy"], ["signature"]], ["bh_2", "Shrimp Garlic Rice", 17.8, ["shellfish"], ["spicy"]], ["bh_3", "Roasted Veggie Pasta", 15.2, ["gluten"], ["vegetarian"]]] },
      { id: "res_spice_route", ownerId: "", name: "Spice Route House", cuisine: "Indian", location: "Midtown", rating: 4.6, priceBand: "medium", verificationStatus: "Approved", menu: [["sr_1", "Paneer Tikka Wrap", 11.9, ["dairy", "gluten"], ["vegetarian"]], ["sr_2", "Lentil Curry Bowl", 10.5, [], ["vegan"]], ["sr_3", "Cashew Butter Masala", 13.8, ["tree nut", "dairy"], ["signature"]], ["sr_4", "Grilled Chicken Skewer", 14.2, [], ["high-protein"]]] },
      { id: "res_green_leaf", ownerId: "", name: "Green Leaf Vegan", cuisine: "Vegan", location: "North Quarter", rating: 4.8, priceBand: "low", verificationStatus: "Approved", menu: [["gl_1", "Chickpea Protein Bowl", 9.8, ["sesame"], ["vegan"]], ["gl_2", "Tomato Basil Soup Combo", 8.6, ["gluten"], ["comfort"]], ["gl_3", "Coconut Curry Pot", 10.4, [], ["vegan", "spicy"]]] },
      { id: "res_demo_kitchen", ownerId: "owner_demo_1", name: "Demo Kitchen", cuisine: "Fusion", location: "Downtown", rating: 4.4, priceBand: "medium", verificationStatus: "Approved", menu: [["dk_1", "Grilled Lemon Chicken", 15.8, ["dairy"], ["high-protein"]], ["dk_2", "Millet Veg Bowl", 12.4, ["sesame"], ["vegetarian"]], ["dk_3", "Coconut Fish Curry", 16.9, ["fish", "coconut"], ["signature"]], ["dk_4", "Peanut Crunch Noodles", 13.6, ["peanut", "gluten"], ["spicy"]], ["dk_5", "Herb Lentil Soup", 9.7, ["celery"], ["vegan"]]] },
      { id: "res_spice_terminal", ownerId: "owner_demo_2", name: "Spice Terminal", cuisine: "Indian", location: "Midtown", rating: 4.3, priceBand: "medium", verificationStatus: "Pending", menu: [["st_1", "Paneer Quinoa Masala", 14.1, ["dairy"], ["vegetarian"]], ["st_2", "Jackfruit Tacos", 12.2, ["gluten"], ["vegan"]], ["st_3", "Tandoori Prawn Skewer", 18.4, ["shellfish"], ["high-protein"]], ["st_4", "Cashew Veg Korma", 13.5, ["tree nut", "dairy"], ["vegetarian"]], ["st_5", "Cucumber Chana Salad", 8.8, [], ["vegan"]]] },
      { id: "res_sakura_table", ownerId: "owner_demo_3", name: "Sakura Table", cuisine: "Japanese", location: "Harborfront", rating: 4.7, priceBand: "high", verificationStatus: "Approved", menu: [["sk_1", "Salmon Sushi Roll", 16.3, ["fish", "soy"], ["signature"]], ["sk_2", "Tofu Udon", 12.9, ["gluten", "soy"], ["vegetarian"]], ["sk_3", "Chicken Teriyaki Bowl", 14.8, ["soy", "sesame"], ["high-protein"]], ["sk_4", "Edamame Citrus Salad", 10.5, ["soy"], ["vegan"]]] },
      { id: "res_harvest_bistro", ownerId: "owner_demo_4", name: "Harvest Bistro", cuisine: "Continental", location: "West End", rating: 4.5, priceBand: "high", verificationStatus: "Rejected", menu: [["hb_1", "Avocado Toast", 9.9, ["gluten"], ["breakfast"]], ["hb_2", "Mushroom Risotto", 15.1, ["dairy"], ["vegetarian"]], ["hb_3", "Grilled Sea Bass", 20.6, ["fish", "dairy"], ["signature"]], ["hb_4", "Almond Berry Bowl", 11.3, ["tree nut", "dairy"], ["dessert"]], ["hb_5", "Quinoa Garden Plate", 12.7, [], ["vegan"]]] }
    ];

    templates.forEach(function (template) {
      var restaurant = map[template.id];
      if (!restaurant) {
        restaurant = {
          id: template.id,
          ownerId: template.ownerId,
          name: template.name,
          cuisine: template.cuisine,
          location: template.location,
          rating: template.rating,
          priceBand: template.priceBand,
          description: "Demo restaurant data",
          tags: [normalize(template.cuisine), "demo"],
          verificationStatus: template.verificationStatus,
          menu: []
        };
        restaurants.push(restaurant);
        map[template.id] = restaurant;
      }

      restaurant.ownerId = restaurant.ownerId || template.ownerId;
      restaurant.name = restaurant.name || template.name;
      restaurant.cuisine = restaurant.cuisine || template.cuisine;
      restaurant.location = restaurant.location || template.location;
      restaurant.rating = Number(restaurant.rating || template.rating);
      restaurant.priceBand = restaurant.priceBand || template.priceBand;
      restaurant.description = restaurant.description || "Demo restaurant data";
      restaurant.verificationStatus = restaurant.verificationStatus || template.verificationStatus;
      restaurant.tags = uniqueStrings((restaurant.tags || []).concat([normalize(template.cuisine), "demo"]));
      restaurant.menu = Array.isArray(restaurant.menu) ? restaurant.menu : [];

      var menuMap = {};
      restaurant.menu.forEach(function (item) {
        menuMap[item.id] = item;
      });

      template.menu.forEach(function (row, idx) {
        var statusCycle = ["Approved", "Pending", "Rejected"];
        var availabilityCycle = ["available", "available", "unavailable"];
        var existingItem = menuMap[row[0]];
        if (!existingItem) {
          restaurant.menu.push({
            id: row[0],
            name: row[1],
            price: row[2],
            ingredients: row[1] + " ingredients and portions listed for demo.",
            quantityInfo: "1 serving",
            dishTags: row[4],
            allergyTags: row[3],
            availability: availabilityCycle[idx % availabilityCycle.length],
            verificationStatus: statusCycle[idx % statusCycle.length]
          });
        }
      });
    });

    users.filter(function (user) {
      return user.role === "restaurant";
    }).forEach(function (owner) {
      if (!owner.restaurant) owner.restaurant = ensureRestaurantProfile(null, owner.fullName + " Kitchen");
      var linked = restaurants.find(function (restaurant) { return restaurant.ownerId === owner.id; }) || null;
      if (!linked) {
        restaurants.push({
          id: "res_owner_auto_" + owner.id,
          ownerId: owner.id,
          name: owner.restaurant.name,
          cuisine: owner.restaurant.cuisine,
          location: owner.restaurant.location,
          rating: 4.2,
          priceBand: owner.restaurant.priceBand || "medium",
          description: owner.restaurant.description || "Auto-linked owner restaurant",
          tags: [normalize(owner.restaurant.cuisine), "auto"],
          verificationStatus: owner.verifiedStatus === "Approved" ? "Approved" : "Pending",
          menu: []
        });
      }
    });

    write(DATA_KEYS.restaurants, restaurants);
  }

  function seedDemoReports() {
    var users = getUsers().filter(function (user) { return user.role === "diner"; });
    var reports = read(DATA_KEYS.reports, []);
    var statusCycle = ["Approved", "Pending Verification", "Rejected", "Approved"];

    users.slice(0, 7).forEach(function (user, idx) {
      var report = {
        id: toId("report_demo", idx + 1),
        userId: user.id,
        fileName: "medical_report_" + (idx + 1) + ".pdf",
        notes: "Demo report record for showcase.",
        extractedAllergies: (user.profile && user.profile.allergies) ? user.profile.allergies.slice(0, 2) : [],
        status: statusCycle[idx % statusCycle.length],
        uploadedAt: nowWithOffset(-50 + idx)
      };
      upsertById(reports, report);
    });

    write(DATA_KEYS.reports, reports);
  }

  function seedDemoGroupsAndActive() {
    var users = getUsers();
    var userMap = {};
    users.forEach(function (user) { userMap[user.id] = user; });

    function memberSnapshot(userId) {
      var user = userMap[userId];
      if (!user) return null;
      var profile = ensureDinerProfile(user.profile || {});
      return {
        userId: user.id,
        name: user.fullName || user.username || user.email,
        username: user.username || "",
        phone: user.phone || "",
        allergies: profile.allergies,
        preferences: profile.favoriteCuisines
      };
    }

    var groups = read(DATA_KEYS.groups, []);
    var templates = [
      ["group_demo_1", "diner_demo_1", "Friday Safe Bites", ["diner_demo_2", "diner_demo_3", "diner_demo_4"]],
      ["group_demo_2", "diner_demo_1", "Office Lunch Circle", ["diner_demo_5", "diner_demo_6"]],
      ["group_demo_3", "diner_demo_2", "Weekend Explorer Crew", ["diner_demo_1", "diner_demo_7", "diner_demo_8"]]
    ];

    templates.forEach(function (row, idx) {
      var members = row[3].map(memberSnapshot).filter(Boolean);
      upsertById(groups, {
        id: row[0],
        ownerId: row[1],
        name: row[2],
        memberUserIds: row[3],
        members: members,
        createdAt: nowWithOffset(-35 + idx)
      });
    });

    write(DATA_KEYS.groups, groups);

    var active = read(DATA_KEYS.activeGroups, {});
    if (!active.diner_demo_1) active.diner_demo_1 = "group_demo_1";
    if (!active.diner_demo_2) active.diner_demo_2 = "group_demo_3";
    write(DATA_KEYS.activeGroups, active);
  }

  function seedDemoOrdersReservationsCarts() {
    var users = getUsers().filter(function (user) { return user.role === "diner"; });
    var restaurants = read(DATA_KEYS.restaurants, []).filter(function (restaurant) {
      return Array.isArray(restaurant.menu) && restaurant.menu.length;
    });

    var orders = read(DATA_KEYS.orders, []);
    var orderStatus = ["Placed", "Preparing", "Ready", "Completed", "Completed", "Cancelled"];

    users.forEach(function (user, idx) {
      for (var j = 0; j < 2; j += 1) {
        var restaurant = restaurants[(idx + j) % restaurants.length];
        var first = restaurant.menu[0];
        var second = restaurant.menu[Math.min(1, restaurant.menu.length - 1)];
        var items = [
          {
            menuItemId: first.id,
            name: first.name,
            price: Number(first.price || 0),
            allergyTags: first.allergyTags || [],
            quantity: 1
          },
          {
            menuItemId: second.id,
            name: second.name,
            price: Number(second.price || 0),
            allergyTags: second.allergyTags || [],
            quantity: j === 0 ? 1 : 2
          }
        ];

        var subtotal = items.reduce(function (sum, item) {
          return sum + item.price * item.quantity;
        }, 0);

        upsertById(orders, {
          id: "order_demo_auto_" + idx + "_" + j,
          userId: user.id,
          groupId: idx % 3 === 0 ? "group_demo_1" : null,
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          items: items,
          notes: "Auto-generated demo order",
          status: orderStatus[(idx + j) % orderStatus.length],
          subtotal: Number(subtotal.toFixed(2)),
          serviceFee: 1.5,
          total: Number((subtotal + 1.5).toFixed(2)),
          createdAt: nowWithOffset(-15 + idx, -j)
        });
      }
    });

    write(DATA_KEYS.orders, orders);

    var reservations = read(DATA_KEYS.reservations, []);
    var reservationStatus = ["Pending", "Confirmed", "Rejected", "Completed"];

    restaurants.slice(0, 8).forEach(function (restaurant, idx) {
      upsertById(reservations, {
        id: toId("resv_demo", idx + 1),
        restaurantId: restaurant.id,
        customerName: "Demo Guest " + (idx + 1),
        contact: "guest" + (idx + 1) + "@example.com",
        partySize: (idx % 5) + 2,
        datetime: nowWithOffset(1 + idx, idx % 4),
        notes: "Auto-generated reservation for demo.",
        status: reservationStatus[idx % reservationStatus.length],
        createdAt: nowWithOffset(-idx)
      });
    });

    write(DATA_KEYS.reservations, reservations);

    var carts = read(DATA_KEYS.carts, []);
    users.slice(0, 2).forEach(function (user, idx) {
      var restaurant = restaurants[(idx + 1) % restaurants.length];
      var item = restaurant.menu[0];
      upsertById(carts, {
        id: toId("cart_demo", idx + 1),
        userId: user.id,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        groupId: idx === 0 ? "group_demo_1" : null,
        items: [{
          menuItemId: item.id,
          name: item.name,
          price: Number(item.price || 0),
          allergyTags: item.allergyTags || [],
          quantity: idx + 1
        }],
        updatedAt: nowWithOffset(0, -(idx + 1))
      });
    });

    write(DATA_KEYS.carts, carts);
  }

  function seedDemoData() {
    seedDemoUsers();
    seedDemoRestaurants();
    seedDemoReports();
    seedDemoGroupsAndActive();
    seedDemoOrdersReservationsCarts();
  }

  function seed() {
    seedBaseUsers();
    seedDemoData();
  }

  seed();

  window.appStorage = {
    getUsers: getUsers,
    saveUsers: saveUsers,
    getSession: getSession,
    saveSession: saveSession,
    seed: seed
  };
})();
