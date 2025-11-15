const asideToggle = $("#asideToggle");
const siteAside = $("#siteAside");
let isOpen = false;

asideToggle.on("click", () => {
  if (isOpen) {
    siteAside.addClass("hidden");
  } else {
    siteAside.removeClass("hidden");
  }
  isOpen = !isOpen;
});
