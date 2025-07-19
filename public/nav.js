console.log("dfghjkl;'dfghjk")
document.addEventListener("DOMContentLoaded", () => {
  const navLinks = document.getElementById("navLinks");
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const themeToggle = document.getElementById("themeToggle");

  hamburgerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    navLinks.classList.toggle("show");
  });

  function applyTheme(theme) {
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
    localStorage.setItem("theme", theme);
  }

  themeToggle.addEventListener("change", () => {
    applyTheme(themeToggle.checked ? "dark" : "light");
    if (window.innerWidth <= 768) {
      navLinks.classList.remove("show");
    }
  });

  const storedTheme = localStorage.getItem("theme") || "light";
  applyTheme(storedTheme);
  themeToggle.checked = storedTheme === "dark";

  document.querySelectorAll(".nav-links a").forEach(link => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 768) {
        navLinks.classList.remove("show");
      }
    });
  });

  document.addEventListener("click", (event) => {
    if (window.innerWidth <= 768) {
      if (!navLinks.contains(event.target) && !hamburgerBtn.contains(event.target)) {
        navLinks.classList.remove("show");
      }
    }
  });

  // ✅ Fetch user name and update logo
  fetch('/getUserDetails')
    .then(res => res.json())
    .then(data => {
      if (data.name) {
        document.querySelector('.logo').textContent = data.name;
        // console.log(data.name)
      }
    })
    .catch(err => console.error('Error fetching user details:', err));
});