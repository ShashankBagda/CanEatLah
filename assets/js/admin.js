(function () {
  var KEYS = {
    reports: "can_eat_lah_medical_reports",
    restaurants: "can_eat_lah_restaurants",
    orders: "can_eat_lah_orders",
    reservations: "can_eat_lah_reservations",
    groups: "can_eat_lah_groups",
    carts: "can_eat_lah_carts",
    activeGroups: "can_eat_lah_active_groups"
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

  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function setHtml(id, value) {
    var node = document.getElementById(id);
    if (node) node.innerHTML = value;
  }

  function formatDate(value) {
    try {
      return new Date(value).toLocaleString();
    } catch (error) {
      return value;
    }
  }

  function formatMoney(value) {
    return "$" + Number(value || 0).toFixed(2);
  }

  function statusPill(status) {
    var value = clean(status);
    var low = normalize(value);
    var warn = low.indexOf("reject") >= 0 || low.indexOf("cancel") >= 0 || low.indexOf("unverified") >= 0;
    return '<span class="' + (warn ? "pill-warn" : "pill-ok") + '">' + (value || "-") + "</span>";
  }

  function admin() {
    var user = window.appAuth.currentUser();
    return user && user.role === "admin" ? user : null;
  }

  function navGreeting() {
    var user = admin();
    if (!user) return;
    setText("adminName", user.fullName);
  }

  function users() {
    return window.appStorage.getUsers();
  }

  function saveUsers(nextUsers) {
    window.appStorage.saveUsers(nextUsers);
  }

  function reports() {
    return read(KEYS.reports, []);
  }

  function saveReports(nextReports) {
    write(KEYS.reports, nextReports);
  }

  function restaurants() {
    return read(KEYS.restaurants, []);
  }

  function saveRestaurants(nextRestaurants) {
    write(KEYS.restaurants, nextRestaurants);
  }

  function orders() {
    return read(KEYS.orders, []);
  }

  function reservations() {
    return read(KEYS.reservations, []);
  }

  function ensureDefaults() {
    var listUsers = users();
    var userChanged = false;

    listUsers.forEach(function (user) {
      if (!user.verifiedStatus) {
        if (user.role === "admin") user.verifiedStatus = "Approved";
        else user.verifiedStatus = "Pending";
        userChanged = true;
      }

      if (user.role === "diner") {
        user.profile = user.profile || {};
        user.profile.favoriteCuisines = Array.isArray(user.profile.favoriteCuisines) ? user.profile.favoriteCuisines : [];
        user.profile.allergies = Array.isArray(user.profile.allergies) ? user.profile.allergies : [];
      }
    });

    if (userChanged) {
      saveUsers(listUsers);
    }

    var listReports = reports();
    var reportChanged = false;
    listReports.forEach(function (item) {
      if (!item.status) {
        item.status = "Pending Verification";
        reportChanged = true;
      }
    });
    if (reportChanged) {
      saveReports(listReports);
    }

    var listRestaurants = restaurants();
    var restaurantChanged = false;
    listRestaurants.forEach(function (item) {
      if (!item.verificationStatus) {
        item.verificationStatus = "Pending";
        restaurantChanged = true;
      }
      item.menu = Array.isArray(item.menu) ? item.menu : [];
      item.menu.forEach(function (menuItem) {
        if (!menuItem.verificationStatus) {
          menuItem.verificationStatus = "Pending";
          restaurantChanged = true;
        }
      });
    });
    if (restaurantChanged) {
      saveRestaurants(listRestaurants);
    }
  }

  function userNameById(userId) {
    var user = users().find(function (item) {
      return item.id === userId;
    });
    return user ? user.fullName : "Unknown";
  }

  function restaurantNameById(restaurantId) {
    var item = restaurants().find(function (entry) {
      return entry.id === restaurantId;
    });
    return item ? item.name : "Unknown Restaurant";
  }

  function updateUserStatus(userId, status) {
    var listUsers = users();
    var user = listUsers.find(function (item) { return item.id === userId; });
    if (!user) return;
    user.verifiedStatus = status;
    saveUsers(listUsers);
  }

  function updateReportStatus(reportId, status) {
    var listReports = reports();
    var report = listReports.find(function (item) { return item.id === reportId; });
    if (!report) return;
    report.status = status;
    saveReports(listReports);
  }

  function updateRestaurantStatus(restaurantId, status) {
    var listRestaurants = restaurants();
    var restaurant = listRestaurants.find(function (item) { return item.id === restaurantId; });
    if (!restaurant) return;
    restaurant.verificationStatus = status;
    saveRestaurants(listRestaurants);
  }

  function updateMenuStatus(restaurantId, itemId, status) {
    var listRestaurants = restaurants();
    var restaurant = listRestaurants.find(function (item) { return item.id === restaurantId; });
    if (!restaurant) return;
    var menuItem = (restaurant.menu || []).find(function (entry) { return entry.id === itemId; });
    if (!menuItem) return;
    menuItem.verificationStatus = status;
    saveRestaurants(listRestaurants);
  }

  function createUser(payload) {
    var listUsers = users();
    if (listUsers.some(function (item) { return normalize(item.email) === normalize(payload.email); })) {
      return { ok: false, message: "Email already exists." };
    }

    var user = {
      id: uid(payload.role),
      role: payload.role,
      fullName: clean(payload.fullName),
      email: normalize(payload.email),
      phone: clean(payload.phone),
      password: clean(payload.password) || "Pass@123",
      verifiedStatus: payload.verifiedStatus || "Pending",
      createdAt: new Date().toISOString()
    };

    if (payload.role === "diner") {
      user.profile = {
        favoriteCuisines: [],
        allergies: []
      };
    }

    if (payload.role === "restaurant") {
      user.restaurant = {
        name: clean(payload.restaurantName) || (clean(payload.fullName) + " Kitchen"),
        cuisine: clean(payload.cuisine) || "Multi Cuisine",
        location: clean(payload.location) || "Downtown",
        description: clean(payload.description) || "New restaurant profile.",
        priceBand: clean(payload.priceBand) || "medium"
      };
    }

    listUsers.push(user);
    saveUsers(listUsers);

    if (payload.role === "restaurant") {
      createRestaurant({
        ownerId: user.id,
        name: user.restaurant.name,
        cuisine: user.restaurant.cuisine,
        location: user.restaurant.location,
        description: user.restaurant.description,
        priceBand: user.restaurant.priceBand,
        verificationStatus: user.verifiedStatus === "Approved" ? "Approved" : "Pending"
      });
    }

    return { ok: true };
  }

  function createRestaurant(payload) {
    var listRestaurants = restaurants();
    listRestaurants.push({
      id: uid("res"),
      ownerId: payload.ownerId || "",
      name: clean(payload.name),
      cuisine: clean(payload.cuisine) || "Multi Cuisine",
      location: clean(payload.location) || "Downtown",
      rating: Number(payload.rating || 4.2),
      priceBand: clean(payload.priceBand) || "medium",
      description: clean(payload.description) || "Restaurant profile created by admin.",
      tags: csv(payload.tags).map(normalize),
      verificationStatus: payload.verificationStatus || "Pending",
      menu: []
    });
    saveRestaurants(listRestaurants);
    return { ok: true };
  }

  function deleteUser(userId) {
    var current = admin();
    if (current && current.id === userId) {
      return { ok: false, message: "Cannot delete currently signed in admin." };
    }

    var listUsers = users();
    var target = listUsers.find(function (item) { return item.id === userId; });
    if (!target) {
      return { ok: false, message: "User not found." };
    }

    saveUsers(listUsers.filter(function (item) { return item.id !== userId; }));

    if (target.role === "restaurant") {
      var listRestaurants = restaurants().filter(function (item) { return item.ownerId !== userId; });
      saveRestaurants(listRestaurants);
    }

    saveReports(reports().filter(function (item) { return item.userId !== userId; }));

    write(KEYS.orders, orders().filter(function (item) { return item.userId !== userId; }));
    write(KEYS.groups, read(KEYS.groups, []).filter(function (item) { return item.ownerId !== userId; }));
    write(KEYS.carts, read(KEYS.carts, []).filter(function (item) { return item.userId !== userId; }));

    var map = read(KEYS.activeGroups, {});
    delete map[userId];
    write(KEYS.activeGroups, map);

    return { ok: true };
  }

  function deleteRestaurant(restaurantId) {
    var listRestaurants = restaurants();
    var target = listRestaurants.find(function (item) { return item.id === restaurantId; });
    if (!target) return { ok: false, message: "Restaurant not found." };

    saveRestaurants(listRestaurants.filter(function (item) { return item.id !== restaurantId; }));
    write(KEYS.orders, orders().filter(function (item) { return item.restaurantId !== restaurantId; }));
    write(KEYS.reservations, reservations().filter(function (item) { return item.restaurantId !== restaurantId; }));

    if (target.ownerId) {
      var listUsers = users();
      var owner = listUsers.find(function (item) { return item.id === target.ownerId; });
      if (owner && owner.restaurant) {
        owner.restaurant = null;
        saveUsers(listUsers);
      }
    }

    return { ok: true };
  }

  function deleteMenuItem(restaurantId, itemId) {
    var listRestaurants = restaurants();
    var restaurant = listRestaurants.find(function (item) { return item.id === restaurantId; });
    if (!restaurant) return;
    restaurant.menu = (restaurant.menu || []).filter(function (item) { return item.id !== itemId; });
    saveRestaurants(listRestaurants);
  }

  function initDashboard() {
    ensureDefaults();
    navGreeting();

    var listUsers = users();
    var listReports = reports();
    var listRestaurants = restaurants();

    var pendingUsers = listUsers.filter(function (item) {
      return item.role !== "admin" && item.verifiedStatus === "Pending";
    });
    var pendingReports = listReports.filter(function (item) {
      return item.status === "Pending Verification";
    });
    var pendingRestaurants = listRestaurants.filter(function (item) {
      return item.verificationStatus === "Pending";
    });

    var pendingMenu = [];
    listRestaurants.forEach(function (restaurant) {
      (restaurant.menu || []).forEach(function (item) {
        if (item.verificationStatus === "Pending") {
          pendingMenu.push({
            restaurantName: restaurant.name,
            itemName: item.name,
            itemId: item.id,
            restaurantId: restaurant.id
          });
        }
      });
    });

    setText("metricPendingUsers", String(pendingUsers.length));
    setText("metricPendingReports", String(pendingReports.length));
    setText("metricPendingRestaurants", String(pendingRestaurants.length));
    setText("metricPendingMenu", String(pendingMenu.length));

    setText("metricTotalUsers", String(listUsers.length));
    setText("metricTotalRestaurants", String(listRestaurants.length));
    setText("metricTotalOrders", String(orders().length));
    setText("metricTotalReservations", String(reservations().length));

    if (!pendingUsers.length) {
      setHtml("pendingUsersList", '<div class="empty">No pending user verifications.</div>');
    } else {
      setHtml("pendingUsersList", '<ul class="list-clean">' + pendingUsers.slice(0, 6).map(function (item) {
        return '<li><strong>' + item.fullName + '</strong> (' + item.role + ')<div class="small-note">' + item.email + '</div></li>';
      }).join("") + "</ul>");
    }

    if (!pendingReports.length) {
      setHtml("pendingReportsList", '<div class="empty">No pending report verifications.</div>');
    } else {
      setHtml("pendingReportsList", '<ul class="list-clean">' + pendingReports.slice(0, 6).map(function (item) {
        return '<li><strong>' + (item.fileName || item.id) + '</strong><div class="small-note">User: ' + userNameById(item.userId) + ' | ' + formatDate(item.uploadedAt) + '</div></li>';
      }).join("") + "</ul>");
    }

    if (!pendingRestaurants.length && !pendingMenu.length) {
      setHtml("pendingRestaurantList", '<div class="empty">No pending restaurant/menu verifications.</div>');
    } else {
      setHtml("pendingRestaurantList", '<ul class="list-clean">' + pendingRestaurants.slice(0, 4).map(function (item) {
        return '<li><strong>' + item.name + '</strong><div class="small-note">Restaurant verification pending</div></li>';
      }).join("") + pendingMenu.slice(0, 4).map(function (item) {
        return '<li><strong>' + item.restaurantName + '</strong><div class="small-note">Menu item pending: ' + item.itemName + '</div></li>';
      }).join("") + "</ul>");
    }
  }

  function initVerifyUsers() {
    ensureDefaults();
    navGreeting();

    function renderUsers() {
      var list = users().filter(function (item) { return item.role !== "admin"; });
      if (!list.length) {
        setHtml("userVerifyTable", '<div class="empty">No users found.</div>');
        return;
      }

      setHtml("userVerifyTable", '<div class="table-wrap"><table><thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Current Status</th><th>Set Status</th><th>Action</th></tr></thead><tbody>' + list.map(function (item) {
        return '<tr><td><strong>' + item.fullName + '</strong></td><td>' + item.role + '</td><td>' + item.email + '</td><td>' + statusPill(item.verifiedStatus) + '</td><td><select class="user-status" data-id="' + item.id + '"><option value="Pending"' + (item.verifiedStatus === "Pending" ? " selected" : "") + '>Pending</option><option value="Approved"' + (item.verifiedStatus === "Approved" ? " selected" : "") + '>Approved</option><option value="Rejected"' + (item.verifiedStatus === "Rejected" ? " selected" : "") + '>Rejected</option></select></td><td><button class="btn btn-secondary save-user" data-id="' + item.id + '">Update</button></td></tr>';
      }).join("") + "</tbody></table></div>");

      Array.prototype.slice.call(document.querySelectorAll(".save-user")).forEach(function (button) {
        button.addEventListener("click", function () {
          var userId = button.getAttribute("data-id");
          var select = document.querySelector('.user-status[data-id="' + userId + '"]');
          updateUserStatus(userId, select.value);
          renderUsers();
        });
      });
    }

    function renderReports() {
      var list = reports();
      if (!list.length) {
        setHtml("reportVerifyTable", '<div class="empty">No medical reports found.</div>');
        return;
      }

      setHtml("reportVerifyTable", '<div class="table-wrap"><table><thead><tr><th>Uploaded</th><th>User</th><th>Report</th><th>Extracted Allergies</th><th>Current Status</th><th>Set Status</th><th>Action</th></tr></thead><tbody>' + list.map(function (item) {
        return '<tr><td>' + formatDate(item.uploadedAt) + '</td><td>' + userNameById(item.userId) + '</td><td><strong>' + (item.fileName || item.id) + '</strong></td><td>' + ((item.extractedAllergies || []).join(", ") || "-") + '</td><td>' + statusPill(item.status) + '</td><td><select class="report-status" data-id="' + item.id + '"><option value="Pending Verification"' + (item.status === "Pending Verification" ? " selected" : "") + '>Pending</option><option value="Approved"' + (item.status === "Approved" ? " selected" : "") + '>Approved</option><option value="Rejected"' + (item.status === "Rejected" ? " selected" : "") + '>Rejected</option></select></td><td><button class="btn btn-secondary save-report" data-id="' + item.id + '">Update</button></td></tr>';
      }).join("") + "</tbody></table></div>");

      Array.prototype.slice.call(document.querySelectorAll(".save-report")).forEach(function (button) {
        button.addEventListener("click", function () {
          var reportId = button.getAttribute("data-id");
          var select = document.querySelector('.report-status[data-id="' + reportId + '"]');
          updateReportStatus(reportId, select.value);
          renderReports();
        });
      });
    }

    renderUsers();
    renderReports();
  }

  function initVerifyRestaurants() {
    ensureDefaults();
    navGreeting();

    function renderRestaurants() {
      var list = restaurants();
      if (!list.length) {
        setHtml("restaurantVerifyTable", '<div class="empty">No restaurants found.</div>');
        return;
      }

      setHtml("restaurantVerifyTable", '<div class="table-wrap"><table><thead><tr><th>Name</th><th>Owner</th><th>Cuisine</th><th>Location</th><th>Current Status</th><th>Set Status</th><th>Action</th></tr></thead><tbody>' + list.map(function (item) {
        return '<tr><td><strong>' + item.name + '</strong></td><td>' + (item.ownerId ? userNameById(item.ownerId) : "-") + '</td><td>' + (item.cuisine || "-") + '</td><td>' + (item.location || "-") + '</td><td>' + statusPill(item.verificationStatus) + '</td><td><select class="restaurant-status" data-id="' + item.id + '"><option value="Pending"' + (item.verificationStatus === "Pending" ? " selected" : "") + '>Pending</option><option value="Approved"' + (item.verificationStatus === "Approved" ? " selected" : "") + '>Approved</option><option value="Rejected"' + (item.verificationStatus === "Rejected" ? " selected" : "") + '>Rejected</option></select></td><td><button class="btn btn-secondary save-restaurant" data-id="' + item.id + '">Update</button></td></tr>';
      }).join("") + "</tbody></table></div>");

      Array.prototype.slice.call(document.querySelectorAll(".save-restaurant")).forEach(function (button) {
        button.addEventListener("click", function () {
          var restaurantId = button.getAttribute("data-id");
          var select = document.querySelector('.restaurant-status[data-id="' + restaurantId + '"]');
          updateRestaurantStatus(restaurantId, select.value);
          renderRestaurants();
          renderMenuItems();
        });
      });
    }

    function renderMenuItems() {
      var rows = [];
      restaurants().forEach(function (restaurant) {
        (restaurant.menu || []).forEach(function (item) {
          rows.push({
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            itemId: item.id,
            itemName: item.name,
            allergyTags: item.allergyTags || [],
            quantityInfo: item.quantityInfo || "",
            ingredients: item.ingredients || "",
            verificationStatus: item.verificationStatus || "Pending"
          });
        });
      });

      if (!rows.length) {
        setHtml("menuVerifyTable", '<div class="empty">No menu items available for verification.</div>');
        return;
      }

      setHtml("menuVerifyTable", '<div class="table-wrap"><table><thead><tr><th>Restaurant</th><th>Item</th><th>Ingredients</th><th>Quantity Notes</th><th>Allergy Tags</th><th>Current Status</th><th>Set Status</th><th>Action</th></tr></thead><tbody>' + rows.map(function (row) {
        return '<tr><td>' + row.restaurantName + '</td><td><strong>' + row.itemName + '</strong></td><td>' + (row.ingredients || "-") + '</td><td>' + (row.quantityInfo || "-") + '</td><td>' + (row.allergyTags.join(", ") || "None") + '</td><td>' + statusPill(row.verificationStatus) + '</td><td><select class="menu-status" data-rid="' + row.restaurantId + '" data-id="' + row.itemId + '"><option value="Pending"' + (row.verificationStatus === "Pending" ? " selected" : "") + '>Pending</option><option value="Approved"' + (row.verificationStatus === "Approved" ? " selected" : "") + '>Approved</option><option value="Rejected"' + (row.verificationStatus === "Rejected" ? " selected" : "") + '>Rejected</option></select></td><td><button class="btn btn-secondary save-menu" data-rid="' + row.restaurantId + '" data-id="' + row.itemId + '">Update</button></td></tr>';
      }).join("") + "</tbody></table></div>");

      Array.prototype.slice.call(document.querySelectorAll(".save-menu")).forEach(function (button) {
        button.addEventListener("click", function () {
          var restaurantId = button.getAttribute("data-rid");
          var itemId = button.getAttribute("data-id");
          var select = document.querySelector('.menu-status[data-rid="' + restaurantId + '"][data-id="' + itemId + '"]');
          updateMenuStatus(restaurantId, itemId, select.value);
          renderMenuItems();
        });
      });
    }

    renderRestaurants();
    renderMenuItems();
  }

  function initCrud() {
    ensureDefaults();
    navGreeting();

    var userForm = document.getElementById("createUserForm");
    var restaurantForm = document.getElementById("createRestaurantForm");
    var userMsg = document.getElementById("crudUserMessage");
    var restaurantMsg = document.getElementById("crudRestaurantMessage");

    function renderCrudTables() {
      var allUsers = users();
      var allRestaurants = restaurants();

      if (!allUsers.length) {
        setHtml("crudUserTable", '<div class="empty">No users available.</div>');
      } else {
        setHtml("crudUserTable", '<div class="table-wrap"><table><thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Status</th><th>Action</th></tr></thead><tbody>' + allUsers.map(function (item) {
          return '<tr><td><strong>' + item.fullName + '</strong></td><td>' + item.role + '</td><td>' + item.email + '</td><td>' + statusPill(item.verifiedStatus || "Pending") + '</td><td><button class="btn btn-secondary del-user" data-id="' + item.id + '">Delete</button></td></tr>';
        }).join("") + "</tbody></table></div>");

        Array.prototype.slice.call(document.querySelectorAll(".del-user")).forEach(function (button) {
          button.addEventListener("click", function () {
            var result = deleteUser(button.getAttribute("data-id"));
            userMsg.className = "form-message " + (result.ok ? "ok" : "error");
            userMsg.textContent = result.ok ? "User deleted." : result.message;
            renderCrudTables();
          });
        });
      }

      if (!allRestaurants.length) {
        setHtml("crudRestaurantTable", '<div class="empty">No restaurants available.</div>');
      } else {
        setHtml("crudRestaurantTable", '<div class="table-wrap"><table><thead><tr><th>Name</th><th>Owner</th><th>Status</th><th>Menu Count</th><th>Action</th></tr></thead><tbody>' + allRestaurants.map(function (item) {
          return '<tr><td><strong>' + item.name + '</strong></td><td>' + (item.ownerId ? userNameById(item.ownerId) : "-") + '</td><td>' + statusPill(item.verificationStatus) + '</td><td>' + ((item.menu || []).length) + '</td><td><button class="btn btn-secondary del-restaurant" data-id="' + item.id + '">Delete</button></td></tr>';
        }).join("") + "</tbody></table></div>");

        Array.prototype.slice.call(document.querySelectorAll(".del-restaurant")).forEach(function (button) {
          button.addEventListener("click", function () {
            var result = deleteRestaurant(button.getAttribute("data-id"));
            restaurantMsg.className = "form-message " + (result.ok ? "ok" : "error");
            restaurantMsg.textContent = result.ok ? "Restaurant deleted." : result.message;
            renderCrudTables();
          });
        });
      }

      var menuRows = [];
      allRestaurants.forEach(function (restaurant) {
        (restaurant.menu || []).forEach(function (item) {
          menuRows.push({
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            itemId: item.id,
            itemName: item.name,
            status: item.verificationStatus || "Pending"
          });
        });
      });

      if (!menuRows.length) {
        setHtml("crudMenuTable", '<div class="empty">No menu items available.</div>');
      } else {
        setHtml("crudMenuTable", '<div class="table-wrap"><table><thead><tr><th>Restaurant</th><th>Item</th><th>Status</th><th>Action</th></tr></thead><tbody>' + menuRows.map(function (row) {
          return '<tr><td>' + row.restaurantName + '</td><td><strong>' + row.itemName + '</strong></td><td>' + statusPill(row.status) + '</td><td><button class="btn btn-secondary del-menu" data-rid="' + row.restaurantId + '" data-id="' + row.itemId + '">Delete</button></td></tr>';
        }).join("") + "</tbody></table></div>");

        Array.prototype.slice.call(document.querySelectorAll(".del-menu")).forEach(function (button) {
          button.addEventListener("click", function () {
            deleteMenuItem(button.getAttribute("data-rid"), button.getAttribute("data-id"));
            renderCrudTables();
          });
        });
      }
    }

    userForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var payload = {
        role: clean(userForm.role.value),
        fullName: clean(userForm.fullName.value),
        email: clean(userForm.email.value),
        phone: clean(userForm.phone.value),
        password: clean(userForm.password.value),
        verifiedStatus: clean(userForm.verifiedStatus.value),
        restaurantName: clean(userForm.restaurantName.value),
        cuisine: clean(userForm.cuisine.value),
        location: clean(userForm.location.value),
        description: clean(userForm.description.value),
        priceBand: clean(userForm.priceBand.value)
      };

      if (!payload.role || !payload.fullName || !payload.email) {
        userMsg.className = "form-message error";
        userMsg.textContent = "Role, full name and email are required.";
        return;
      }

      if (payload.role === "restaurant" && !payload.restaurantName) {
        userMsg.className = "form-message error";
        userMsg.textContent = "Restaurant name is required for restaurant owner role.";
        return;
      }

      var result = createUser(payload);
      userMsg.className = "form-message " + (result.ok ? "ok" : "error");
      userMsg.textContent = result.ok ? "User created successfully." : result.message;
      if (result.ok) userForm.reset();
      renderCrudTables();
    });

    restaurantForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var payload = {
        ownerId: clean(restaurantForm.ownerId.value),
        name: clean(restaurantForm.name.value),
        cuisine: clean(restaurantForm.cuisine.value),
        location: clean(restaurantForm.location.value),
        description: clean(restaurantForm.description.value),
        priceBand: clean(restaurantForm.priceBand.value),
        tags: clean(restaurantForm.tags.value),
        verificationStatus: clean(restaurantForm.verificationStatus.value)
      };

      if (!payload.name) {
        restaurantMsg.className = "form-message error";
        restaurantMsg.textContent = "Restaurant name is required.";
        return;
      }

      createRestaurant(payload);
      restaurantMsg.className = "form-message ok";
      restaurantMsg.textContent = "Restaurant created successfully.";
      restaurantForm.reset();
      renderCrudTables();
    });

    renderCrudTables();
  }

  window.adminPortal = {
    initDashboard: initDashboard,
    initVerifyUsers: initVerifyUsers,
    initVerifyRestaurants: initVerifyRestaurants,
    initCrud: initCrud
  };
})();
