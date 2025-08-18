async function inject(selector, url) {
  const el = document.querySelector(selector);
  if (!el) return;
  try {
    const res = await fetch(url, { cache: "no-store" });
    el.innerHTML = await res.text();
  } catch (e) { console.error("Include failed:", url, e); }
}

document.addEventListener("DOMContentLoaded", async () => {
  await inject("#site-header", "/assets/header.html");
  await inject("#site-footer", "/assets/footer.html");

  // theme toggle (works after header injected)
  document.addEventListener("click", (e) => {
    if (e.target?.id === "themeToggle") {
      const dark = document.documentElement.classList.toggle("dark");
      localStorage.theme = dark ? "dark" : "light";
    }
  });

  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
});