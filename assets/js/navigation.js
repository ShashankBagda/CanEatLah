(function () {
  function inPagesDirectory() {
    return window.location.pathname.toLowerCase().indexOf("/pages/") >= 0;
  }

  function assetPath(fileName) {
    return (inPagesDirectory() ? "../assets/svg/" : "assets/svg/") + fileName;
  }

  function signInPath() {
    return inPagesDirectory() ? "signin.html" : "pages/signin.html";
  }

  function setYear() {
    var yearNode = document.getElementById("year");
    if (yearNode) {
      yearNode.textContent = String(new Date().getFullYear());
    }
  }

  function setupSignOut() {
    var trigger = document.getElementById("signOutBtn");
    if (!trigger || !window.appAuth) return;
    trigger.addEventListener("click", function () {
      window.appAuth.signOut();
      window.location.href = signInPath();
    });
  }

  function figureForPath(path) {
    if (path.indexOf("/pages/diner-") >= 0) return "diner-ai.svg";
    if (path.indexOf("/pages/restaurant-") >= 0) return "restaurant-ops.svg";
    if (path.indexOf("/pages/admin-") >= 0) return "admin-verify.svg";
    if (path.indexOf("/pages/signin") >= 0 || path.indexOf("/pages/signup-") >= 0) return "auth-welcome.svg";
    return "landing-hero.svg";
  }

  function mountHeroGraphic() {
    var heroPanel = document.querySelector(".hero-panel");
    if (!heroPanel || heroPanel.querySelector(".hero-graphic")) return;
    var image = document.createElement("img");
    image.className = "hero-graphic";
    image.alt = "Allergy-safe dining illustration";
    image.src = assetPath("landing-hero.svg");
    heroPanel.appendChild(image);
  }

  function mountAuthGraphic() {
    var authBrand = document.querySelector(".auth-brand");
    if (!authBrand || authBrand.querySelector(".auth-graphic")) return;
    var image = document.createElement("img");
    image.className = "auth-graphic";
    image.alt = "Secure account access illustration";
    image.src = assetPath("auth-welcome.svg");
    authBrand.appendChild(image);
  }

  function mountPortalGraphic() {
    var top = document.querySelector(".portal-top");
    if (!top || top.querySelector(".portal-art-wrap")) return;

    var wrap = document.createElement("div");
    wrap.className = "portal-art-wrap";

    var image = document.createElement("img");
    image.className = "portal-graphic";
    image.alt = "Portal illustration";
    image.src = assetPath(figureForPath(window.location.pathname.toLowerCase()));

    wrap.appendChild(image);
    top.appendChild(wrap);
  }

  function setupReveal() {
    var items = Array.prototype.slice.call(
      document.querySelectorAll(".card, .portal-top, .hero-copy, .hero-panel, .section-heading, .auth-brand, .form-shell")
    );
    if (!items.length) return;

    items.forEach(function (item) {
      item.classList.add("reveal");
    });

    if (!("IntersectionObserver" in window)) {
      items.forEach(function (item) {
        item.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12
      }
    );

    items.forEach(function (item) {
      observer.observe(item);
    });
  }

  function mountVisuals() {
    mountHeroGraphic();
    mountAuthGraphic();
    mountPortalGraphic();
    setupReveal();
  }

  setYear();
  setupSignOut();
  mountVisuals();
})();
