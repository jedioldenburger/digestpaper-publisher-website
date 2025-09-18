// Apply white border to Nieuws categories
document.addEventListener("DOMContentLoaded", function () {
  // Function to add data-category attribute to all article-category elements
  function addCategoryAttributes() {
    // Get all article-category elements
    const categoryElements = document.querySelectorAll(".article-category");

    // Add data-category attribute based on text content
    categoryElements.forEach((element) => {
      const categoryText = element.textContent.trim();
      element.setAttribute("data-category", categoryText);

      // Add special class for Nieuws category
      if (categoryText === "Nieuws") {
        element.classList.add("nieuws-category");
      }
    });

    // Handle news items in the news flasher
    const newsItems = document.querySelectorAll(".news-item");
    newsItems.forEach((item) => {
      if (item.textContent.includes("Nieuws")) {
        const icon = item.querySelector(".news-item-icon");
        if (icon) {
          icon.classList.add("nieuws-icon");
        }
      }
    });
  }

  // Run initially
  addCategoryAttributes();

  // Also run when DOM changes (for dynamically added content)
  // Using MutationObserver to detect when new elements are added
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.addedNodes.length) {
        addCategoryAttributes();
      }
    });
  });

  // Start observing
  observer.observe(document.body, { childList: true, subtree: true });
});
