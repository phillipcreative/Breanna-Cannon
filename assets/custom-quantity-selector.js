document.addEventListener("DOMContentLoaded", () => {
  // Update Add to Cart Total based on quantity selector and selected rebuy products
  window.updateAddToCartTotal = () => {
    const quantitySelector = document.querySelector('.custom-quantity-selector');
    if (!quantitySelector) return;

    const selectedQuantityInput = quantitySelector.querySelector('input[name="quantity_tier"]:checked');
    const atcTotal = document.querySelector('.atc-total');

    if (!selectedQuantityInput || !atcTotal) return;

    // Access data attributes for main product
    const discountedPriceCents = selectedQuantityInput.getAttribute('data-discounted-price-cents');
    const totalPriceCents = selectedQuantityInput.getAttribute('data-total-price-cents');

    if (!discountedPriceCents) return;

    let discountedPrice = parseInt(discountedPriceCents) || 0;
    let totalPrice = parseInt(totalPriceCents) || 0;

    // Add selected rebuy product prices
    const rebuyContainers = document.querySelectorAll('.rebuy-recommendations-container');
    rebuyContainers.forEach((container) => {
      const checkedBoxes = container.querySelectorAll('.rebuy-product-card__checkbox:checked');
      checkedBoxes.forEach((checkbox) => {
        const productPrice = checkbox.getAttribute('data-product-price');
        if (productPrice) {
          // Parse price - Rebuy might return formatted price like "$45.00" or just "45.00"
          const priceStr = productPrice.toString().replace(/[^0-9.]/g, '');
          const priceValue = parseFloat(priceStr) || 0;
          // Convert to cents if it's a dollar amount (less than 1000)
          const priceInCents = priceValue < 1000 ? Math.round(priceValue * 100) : Math.round(priceValue);
          discountedPrice += priceInCents;
          totalPrice += priceInCents;
        }
      });
    });

    // Format price function - keep trailing zeros for add to cart button
    const formatPrice = (cents) => {
      if (window.theme && window.theme.Currency && window.theme.Currency.formatMoney) {
        const moneyFormat = window.theme.settings?.moneyFormat || '${{amount}}';
        return window.theme.Currency.formatMoney(cents, moneyFormat);
      }
      // Fallback formatting with trailing zeros
      const price = cents / 100;
      return '$' + price.toFixed(2);
    };

    const currentPriceEl = atcTotal.querySelector('.current-price');
    const discountedPriceEl = atcTotal.querySelector('.discounted-price');

    // Show original price with strikethrough if there's a discount
    if (currentPriceEl) {
      const baseDiscountedPrice = parseInt(discountedPriceCents) || 0;
      const baseTotalPrice = parseInt(totalPriceCents) || 0;
      if (baseTotalPrice > baseDiscountedPrice && baseDiscountedPrice > 0) {
        currentPriceEl.textContent = formatPrice(totalPrice);
        currentPriceEl.style.display = '';
        currentPriceEl.style.textDecoration = 'line-through';
      } else {
        currentPriceEl.style.display = 'none';
      }
    }

    // Always show discounted price
    if (discountedPriceEl) {
      discountedPriceEl.textContent = formatPrice(discountedPrice);
      discountedPriceEl.style.display = '';
    }
  };

  // Initialize after a short delay to ensure DOM and theme are ready
  const initAddToCartTotal = () => {
    const quantitySelector = document.querySelector('.custom-quantity-selector');
    const atcTotal = document.querySelector('.atc-total');

    if (!quantitySelector || !atcTotal) return;

    // Hide product-block--price when custom quantity selector is active
    const priceBlock = document.querySelector('.product-block--price');
    if (priceBlock) {
      priceBlock.style.display = 'none';
    }

    window.updateAddToCartTotal();

    // Also listen for quantity selector changes
    quantitySelector.querySelectorAll('input[name="quantity_tier"]').forEach((radio) => {
      radio.addEventListener('change', window.updateAddToCartTotal);
    });
  };

  // Wait a bit for theme to load, then initialize
  setTimeout(initAddToCartTotal, 100);
});
