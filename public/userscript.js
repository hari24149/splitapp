function openDeleteModal() {
      document.getElementById("delete-modal").style.display = "flex";
    }

    function closeModal(id) {
      document.getElementById(id).style.display = "none";
    }
    function deleteAccount(event) {
      event.preventDefault();
      const password = document.getElementById("delete-password").value;
      const deleteBtn = document.getElementById("delete-btn");

      if (!password) return alert("Please enter your password.");

      deleteBtn.disabled = true;

      fetch("/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password })
      })
        .then(async (res) => {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            alert(data.message || "Account deleted successfully");
            if (res.ok && data.success) {
              window.location.href = "/";
            }
          } else {
            const text = await res.text();
            console.error("Non-JSON response:", text);
            alert("Unexpected error. Please try again.");
          }
        })
        .catch((err) => {
          console.error("Fetch error:", err);
          alert("Network or server error.");
        })
        .finally(() => {
          deleteBtn.disabled = false;
        });
    }

    function openDeleteModal() {
      document.getElementById("delete-modal").style.display = "block";
    }
    function closeModal(id) {
      document.getElementById(id).style.display = "none";
    }

    // Optional: close modal on outside click
    window.onclick = function (event) {
      const modal = document.getElementById("delete-modal");
      if (event.target === modal) closeModal("delete-modal");
    };



    function toggleSidebar(icon) {
      document.getElementById("sidebar").classList.toggle("open");
      icon.classList.toggle("active");
    }
    function showSection(id, el) {
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.getElementById(id).classList.add('active');
      document.getElementById("section-title").innerText = id.charAt(0).toUpperCase() + id.slice(1);
      document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
      el.classList.add('active');
      if (window.innerWidth <= 768) {
        document.getElementById("sidebar").classList.remove("open");
        document.querySelector(".hamburger").classList.remove("active");
      }
    }
    function openLogoutModal(event) {
      event.preventDefault();
      showModal('logout-modal');
    }
    function confirmLogout() {
      window.location.href = "/logout";
    }
    function showModal(id) {
      document.getElementById(id).style.display = "block";
    }
    function closeModal(id) {
      document.getElementById(id).style.display = "none";
    }
    function shareApp() { showModal('share-modal'); }
    function rateApp() { showModal('rate-modal'); }
    function editProfile() { showModal('edit-password-modal'); }
    function openModal() {
    document.getElementById('changeEmailModal').style.display = 'block';
}

    function submitChangePassword(e) {
      e.preventDefault();
      const current = document.getElementById("current-password").value;
      const newP = document.getElementById("new-password").value;
      const confirmP = document.getElementById("confirm-password").value;
      if (newP !== confirmP) return alert("New passwords do not match.");
      fetch("/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword: current, newPassword: newP })
      }).then(res => res.json())
        .then(data => {
          alert(data.message || "Password changed.");
          closeModal("edit-password-modal");
          window.location.href = "/logout";
        }).catch(err => alert("Error: " + err.message));
    }

    window.onclick = function (event) {
      ["logout-modal", "share-modal", "rate-modal", "edit-password-modal"].forEach(id => {
        if (event.target === document.getElementById(id)) closeModal(id);
      });
    };

    document.getElementById("theme-toggle").addEventListener("change", function () {
      document.body.classList.toggle("light", !this.checked);
      localStorage.setItem("theme", this.checked ? "dark" : "light");
    });

    window.addEventListener("load", () => {
      const theme = localStorage.getItem("theme");
      if (theme === "light") {
        document.body.classList.add("light");
        document.getElementById("theme-toggle").checked = false;
      }

      // Load user details from backend
      fetch("/getUserDetails", {
        method: "GET",
        credentials: "include",
      })
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Unauthorized");
          }
          return res.json();
        })
        .then((user) => {
          document.getElementById("user-name").innerText = user.name;
          document.getElementById("user-email").innerText = user.email;
        })
        .catch((err) => {
          document.getElementById("user-name").innerText = "Not logged in";
          document.getElementById("user-email").innerText = "Please login";
          alert(err.message || "Unable to load user info");
          // Optional redirect:
          // window.location.href = "/login";
        });
    });
    async function sessionCheckAdmin() {
      try {
        const response = await fetch('/sessioncheck', {
          method: 'GET',
          credentials: 'include',
        });

        const data = await response.json();
        localStorage.setItem("uname",data.name)
        if (data.loggedIn) {
          if (data.role !== 'admin') {
            console.log("user")
          } else {
            window.location.href = '/admin.html';
          }
        } else {
          window.location.href = '/login.html';
        }
      } catch (error) {
        console.error("Error checking session:", error);
        window.location.href = '/login.html';
      }
    }
     window.addEventListener('DOMContentLoaded', sessionCheckAdmin);
    async function changeEmail() {
    const currentEmail = document.getElementById('currentEmail').value;
    const newEmail = document.getElementById('newEmail').value;

    const response = await fetch('/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentEmail, newEmail })
    });

    const data = await response.json();
    alert(data.message);
    if (data.success) closeModal();
}

document.getElementById("username").innerHTML= localStorage.getItem("uname");
document.getElementById("usernamedash").innerHTML= localStorage.getItem("uname");