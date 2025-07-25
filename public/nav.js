function initNavbar() {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const navLinks = document.getElementById('navLinks');
  const themeToggle = document.getElementById('themeToggle');

  if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', () => {
      navLinks.classList.toggle('show');
    });
  }

  if (themeToggle) {
    if (localStorage.getItem('theme') === 'light') {
      document.body.classList.add('light');
      themeToggle.checked = true;
    }

    themeToggle.addEventListener('change', () => {
      document.body.classList.toggle('light', themeToggle.checked);
      localStorage.setItem('theme', themeToggle.checked ? 'light' : 'dark');
    });
  }

  let suppressNextClick = false;

  document.addEventListener('click', (event) => {
    const isClickInsideNavbar = event.target.closest('.navbar');
    const isNavLinksVisible = navLinks && navLinks.classList.contains('show');
    const isHamburger = event.target.id === 'hamburgerBtn' || event.target.closest('#hamburgerBtn');

    if (!isClickInsideNavbar && isNavLinksVisible) {
      navLinks.classList.remove('show');
      suppressNextClick = true;
      console.log('Closed navbar. Clicked on element with id:', event.target.id || 'no id');
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (suppressNextClick) {
      if (!isHamburger) {
        suppressNextClick = false;
        event.preventDefault();
        event.stopPropagation();
        console.log('Suppressed click after navbar closed.');
      } else {
        suppressNextClick = false;
      }
    }
  }, true);

  // ✅ Fetch user details and update logo
  // fetch('/getUserDetails')
  //   .then(res => res.json())
  //   .then(data => {
  //     const logoSpan = document.querySelector('.logo');
  //     if (logoSpan && data.name) {
  //       logoSpan.textContent = data.name;
  //     }
  //   })
  //   .catch(err => {
  //     console.error('Failed to load user details:', err);
  //   });
  document.querySelector('.logo').textContent = localStorage.getItem("uname");
}
