(function () {
  var KEYS = {
    users: "can_eat_lah_users",
    session: "can_eat_lah_session"
  };

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }

  function write(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
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

  function seed() {
    var users = getUsers();
    if (users.length) return;

    var seeded = [
      {
        id: "diner_demo_1",
        role: "diner",
        fullName: "Demo Diner",
        username: "demodiner",
        email: "diner@caneatlah.local",
        phone: "",
        password: "Pass@123",
        profile: {
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
        },
        createdAt: new Date().toISOString()
      },
      {
        id: "owner_demo_1",
        role: "restaurant",
        fullName: "Demo Restaurant Owner",
        username: "demorestaurant",
        email: "restaurant@caneatlah.local",
        phone: "",
        password: "Pass@123",
        restaurant: {
          name: "Demo Kitchen",
          cuisine: "Multi Cuisine",
          location: "Downtown"
        },
        createdAt: new Date().toISOString()
      },
      {
        id: "admin_demo_1",
        role: "admin",
        fullName: "Platform Admin",
        username: "platformadmin",
        email: "admin@caneatlah.local",
        phone: "",
        password: "Pass@123",
        createdAt: new Date().toISOString()
      }
    ];

    saveUsers(seeded);
  }

  window.appStorage = {
    getUsers: getUsers,
    saveUsers: saveUsers,
    getSession: getSession,
    saveSession: saveSession,
    seed: seed
  };
})();
