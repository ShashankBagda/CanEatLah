(function () {
  var ROLE_LABELS = {
    diner: "Diner",
    restaurant: "Restaurant Owner",
    admin: "Admin"
  };

  var DASHBOARD_PATHS = {
    diner: "diner-dashboard.html",
    restaurant: "restaurant-dashboard.html",
    admin: "admin-dashboard.html"
  };

  function clean(str) {
    return (str || "").trim();
  }

  function normalizeEmail(email) {
    return clean(email).toLowerCase();
  }

  function normalizePhone(phone) {
    return clean(phone).replace(/[^0-9]/g, "");
  }

  function normalizeUsername(username) {
    return clean(username)
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, "");
  }

  function id(prefix) {
    return prefix + "_" + Math.random().toString(36).slice(2, 9);
  }

  function showMessage(container, type, message) {
    container.className = "form-message " + type;
    container.textContent = message;
  }

  function findUserByEmail(email) {
    var users = window.appStorage.getUsers();
    return users.find(function (user) {
      return user.email === normalizeEmail(email);
    });
  }

  function findUserByUsername(username) {
    var normalized = normalizeUsername(username);
    if (!normalized) return null;
    var users = window.appStorage.getUsers();
    return users.find(function (user) {
      return normalizeUsername(user.username) === normalized;
    });
  }

  function uniqueUsername(base, users, ignoreUserId) {
    var initial = normalizeUsername(base) || "user";
    var taken = {};
    users.forEach(function (item) {
      if (ignoreUserId && item.id === ignoreUserId) return;
      var value = normalizeUsername(item.username);
      if (value) taken[value] = true;
    });

    var candidate = initial;
    var index = 1;
    while (taken[candidate]) {
      candidate = initial + index;
      index += 1;
    }
    return candidate;
  }

  function ensureIdentityFields() {
    var users = window.appStorage.getUsers();
    var changed = false;
    var seen = {};

    users.forEach(function (user) {
      var base = normalizeUsername(user.username || user.fullName || (user.email || "").split("@")[0] || "user");
      if (!base) base = "user";

      var candidate = base;
      var i = 1;
      while (seen[candidate]) {
        candidate = base + i;
        i += 1;
      }
      seen[candidate] = true;

      if (user.username !== candidate) {
        user.username = candidate;
        changed = true;
      }

      var normalizedPhone = normalizePhone(user.phone || "");
      if ((user.phone || "") !== normalizedPhone) {
        user.phone = normalizedPhone;
        changed = true;
      }
      if (!user.phone) {
        user.phone = "";
      }
    });

    if (changed) {
      window.appStorage.saveUsers(users);
    }
  }

  function createUser(payload) {
    var users = window.appStorage.getUsers();
    if (findUserByEmail(payload.email)) {
      return {
        ok: false,
        message: "This email is already registered."
      };
    }

    var username = normalizeUsername(payload.username);
    if (payload.role === "diner" && !username) {
      return {
        ok: false,
        message: "Username is required for diner account."
      };
    }

    if (username && findUserByUsername(username)) {
      return {
        ok: false,
        message: "This username is already taken."
      };
    }

    if (!username) {
      username = uniqueUsername(payload.fullName || payload.email, users);
    }

    var user = {
      id: id(payload.role),
      role: payload.role,
      fullName: clean(payload.fullName),
      username: username,
      email: normalizeEmail(payload.email),
      phone: normalizePhone(payload.phone),
      password: payload.password,
      createdAt: new Date().toISOString()
    };

    if (payload.role === "diner") {
      user.profile = {
        favoriteCuisines: [],
        allergies: [],
        dietPreferences: [],
        dietPreference: "",
        spiceLevel: "medium",
        sugarLevel: "medium",
        budget: "medium",
        notes: "",
        address: "",
        emergencyContact: ""
      };
    }

    if (payload.role === "restaurant") {
      user.restaurant = {
        name: clean(payload.restaurantName),
        cuisine: clean(payload.cuisine),
        location: clean(payload.location)
      };
    }

    users.push(user);
    window.appStorage.saveUsers(users);
    return {
      ok: true,
      user: user
    };
  }

  function signIn(email, password, role) {
    var users = window.appStorage.getUsers();
    var user = users.find(function (item) {
      return item.email === normalizeEmail(email);
    });

    if (!user) {
      return { ok: false, message: "No account found with this email." };
    }

    if (user.password !== password) {
      return { ok: false, message: "Invalid password." };
    }

    if (role && user.role !== role) {
      return {
        ok: false,
        message: "This account belongs to " + ROLE_LABELS[user.role] + "."
      };
    }

    window.appStorage.saveSession({
      userId: user.id,
      role: user.role,
      signedInAt: new Date().toISOString()
    });

    return {
      ok: true,
      user: user
    };
  }

  function currentUser() {
    var session = window.appStorage.getSession();
    if (!session) return null;
    var users = window.appStorage.getUsers();
    return users.find(function (item) {
      return item.id === session.userId;
    }) || null;
  }

  function signOut() {
    window.appStorage.saveSession(null);
  }

  function dashboardPathForRole(role) {
    return DASHBOARD_PATHS[role] || "signin.html";
  }

  function requireRole(expectedRole) {
    var user = currentUser();
    if (!user) {
      window.location.href = "signin.html";
      return false;
    }
    if (user.role !== expectedRole) {
      window.location.href = dashboardPathForRole(user.role);
      return false;
    }
    return true;
  }

  function initializeSignIn() {
    window.appStorage.seed();
    ensureIdentityFields();

    var form = document.getElementById("signinForm");
    if (!form) return;

    var messageEl = document.getElementById("signinMessage");
    var current = currentUser();
    if (current) {
      showMessage(messageEl, "ok", "Already signed in as " + ROLE_LABELS[current.role] + ". Redirecting.");
      setTimeout(function () {
        window.location.href = dashboardPathForRole(current.role);
      }, 700);
      return;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var payload = {
        role: clean(form.role.value),
        email: clean(form.email.value),
        password: form.password.value
      };

      if (!payload.role || !payload.email || !payload.password) {
        showMessage(messageEl, "error", "Please fill in all sign in fields.");
        return;
      }

      var result = signIn(payload.email, payload.password, payload.role);
      if (!result.ok) {
        showMessage(messageEl, "error", result.message);
        return;
      }

      showMessage(messageEl, "ok", "Sign in successful. Redirecting to " + ROLE_LABELS[result.user.role] + " portal.");
      setTimeout(function () {
        window.location.href = dashboardPathForRole(result.user.role);
      }, 650);
    });
  }

  function initializeSignup(options) {
    window.appStorage.seed();
    ensureIdentityFields();

    var form = document.getElementById("signupForm");
    if (!form) return;

    var role = options.role;
    var messageEl = document.getElementById("signupMessage");
    var roleInput = document.getElementById("roleLabel");
    if (roleInput) {
      roleInput.textContent = ROLE_LABELS[role] || role;
    }

    var current = currentUser();
    if (current) {
      showMessage(messageEl, "ok", "You are already signed in. Redirecting.");
      setTimeout(function () {
        window.location.href = dashboardPathForRole(current.role);
      }, 600);
      return;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var payload = {
        role: role,
        fullName: clean(form.fullName.value),
        username: clean(form.username ? form.username.value : ""),
        email: clean(form.email.value),
        phone: clean(form.phone.value),
        password: form.password.value,
        confirmPassword: form.confirmPassword.value,
        restaurantName: clean(form.restaurantName ? form.restaurantName.value : ""),
        cuisine: clean(form.cuisine ? form.cuisine.value : ""),
        location: clean(form.location ? form.location.value : "")
      };

      if (!payload.fullName || !payload.email || !payload.password || !payload.confirmPassword) {
        showMessage(messageEl, "error", "Please fill in all required fields.");
        return;
      }

      if (role === "diner" && !payload.username) {
        showMessage(messageEl, "error", "Please choose a username.");
        return;
      }

      if (!payload.email.includes("@")) {
        showMessage(messageEl, "error", "Please enter a valid email address.");
        return;
      }

      if (payload.password.length < 6) {
        showMessage(messageEl, "error", "Password must be at least 6 characters.");
        return;
      }

      if (payload.password !== payload.confirmPassword) {
        showMessage(messageEl, "error", "Passwords do not match.");
        return;
      }

      if (role === "restaurant" && (!payload.restaurantName || !payload.cuisine || !payload.location)) {
        showMessage(messageEl, "error", "Please complete all restaurant details.");
        return;
      }

      var createResult = createUser(payload);
      if (!createResult.ok) {
        showMessage(messageEl, "error", createResult.message);
        return;
      }

      var signInResult = signIn(payload.email, payload.password, role);
      if (!signInResult.ok) {
        showMessage(messageEl, "error", "Account created, but automatic sign in failed.");
        return;
      }

      showMessage(messageEl, "ok", "Account created. Redirecting to your portal.");
      setTimeout(function () {
        window.location.href = dashboardPathForRole(role);
      }, 650);
    });
  }

  window.appAuth = {
    initSignIn: initializeSignIn,
    initSignup: initializeSignup,
    currentUser: currentUser,
    signOut: signOut,
    dashboardPathForRole: dashboardPathForRole,
    requireRole: requireRole
  };
})();
