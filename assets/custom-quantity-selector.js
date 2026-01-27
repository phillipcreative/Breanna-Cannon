document.addEventListener("DOMContentLoaded", () => {
  // Update Add to Cart Total based on quantity selector (base product only, no rebuy)
  window.updateAddToCartTotal = () => {
    const quantitySelector = document.querySelector('.custom-quantity-selector');
    if (!quantitySelector) return;

    const selectedQuantityInput = quantitySelector.querySelector('input[name="quantity_tier"]:checked');
    if (!selectedQuantityInput) return;

    // Prices are static and already calculated in the liquid template
    // No additional updates needed since atc-total element was removed
  };

  // Update all tier prices when variant changes
  const updateTierPrices = (variant) => {
    const quantitySelector = document.querySelector('.custom-quantity-selector');
    if (!quantitySelector || !variant) return;

    const variantPriceCents = variant.price || 0;
    const tierInputs = quantitySelector.querySelectorAll('input[name="quantity_tier"]');

    tierInputs.forEach((input) => {
      const quantity = parseInt(input.value) || 1;
      const discountPercent = parseFloat(input.getAttribute('data-discount-percent')) || 0;

      // Calculate total price for this quantity
      const totalPriceCents = variantPriceCents * quantity;
      const discountAmountCents = Math.round(totalPriceCents * discountPercent / 100);
      const discountedPriceCents = totalPriceCents - discountAmountCents;

      // Update data attributes
      input.setAttribute('data-total-price-cents', totalPriceCents);
      input.setAttribute('data-discounted-price-cents', discountedPriceCents);

      // Update displayed prices
      const option = input.closest('.quantity-option');
      if (option) {
        const priceEl = option.querySelector('.quantity-option__price');
        const compareEl = option.querySelector('.quantity-option__compare');

        // Format price function without trailing zeros
        const formatPrice = (cents) => {
          if (window.theme && window.theme.Currency && window.theme.Currency.formatMoney) {
            const moneyFormat = window.theme.settings?.moneyFormat || '${{amount}}';
            return window.theme.Currency.formatMoney(cents, moneyFormat);
          }
          const price = cents / 100;
          const formatted = price.toFixed(2);
          if (formatted.endsWith('.00')) {
            return '$' + formatted.replace(/\.00$/, '');
          }
          return '$' + formatted;
        };

        if (priceEl) {
          priceEl.textContent = formatPrice(discountedPriceCents);
        }

        if (compareEl) {
          if (discountPercent > 0 && totalPriceCents > discountedPriceCents) {
            compareEl.textContent = formatPrice(totalPriceCents);
            compareEl.style.display = '';
          } else {
            compareEl.style.display = 'none';
          }
        }
      }
    });

    // Update add to cart total
    if (window.updateAddToCartTotal) {
      window.updateAddToCartTotal();
    }
  };

  // Initialize after a short delay to ensure DOM and theme are ready
  const initAddToCartTotal = () => {
    const quantitySelector = document.querySelector('.custom-quantity-selector');
    if (!quantitySelector) return;

    // Hide product-block--price when custom quantity selector is active
    const priceBlock = document.querySelector('.product-block--price');
    if (priceBlock) {
      priceBlock.style.display = 'none';
    }

    // Get current variant and update all tier prices
    const variantJsonEl = document.querySelector('[data-variant-json]');
    if (variantJsonEl) {
      try {
        const variants = JSON.parse(variantJsonEl.textContent);
        const currentVariantSelect = document.querySelector('[data-product-select]');
        if (currentVariantSelect && variants) {
          const selectedVariantId = currentVariantSelect.value;
          const currentVariant = variants.find(v => v.id.toString() === selectedVariantId.toString());
          if (currentVariant) {
            updateTierPrices(currentVariant);
          }
        }
      } catch (e) {
        console.warn('Could not parse variant JSON:', e);
      }
    }

    window.updateAddToCartTotal();

    // Also listen for quantity selector changes
    quantitySelector.querySelectorAll('input[name="quantity_tier"]').forEach((radio) => {
      radio.addEventListener('change', window.updateAddToCartTotal);
    });

    // Listen for variant changes to update all tier prices
    document.addEventListener('variant:change', (e) => {
      if (e.detail && e.detail.variant) {
        updateTierPrices(e.detail.variant);
      }
    });
  };

  // Wait a bit for theme to load, then initialize
  setTimeout(initAddToCartTotal, 100);

  // Handle adding rebuy products to cart along with main product
  const handleAddToCartWithRebuy = () => {
    const addToCartForm = document.querySelector('.product-single__form');
    const addToCartButton = document.querySelector('[data-add-to-cart]');

    if (!addToCartForm || !addToCartButton) return;

    addToCartForm.addEventListener('submit', async function(e) {
      // Get selected rebuy/upsell products from swiper
      const rebuyContainers = document.querySelectorAll('.rebuy-recommendations-container');
      const selectedRebuyProducts = [];

      rebuyContainers.forEach((container) => {
        const checkedBoxes = container.querySelectorAll('.rebuy-product-card__checkbox:checked');
        checkedBoxes.forEach((checkbox) => {
          const productId = checkbox.getAttribute('data-product-id');
          const variantId = checkbox.getAttribute('data-variant-id');
          const productCard = checkbox.closest('.rebuy-product-card');
          const productTitleEl = productCard?.querySelector('.rebuy-product-card__title');
          const productName = productTitleEl?.textContent?.trim() || 'Product';

          if (productId && variantId) {
            selectedRebuyProducts.push({
              id: variantId,
              quantity: 1,
              name: productName
            });
          }
        });
      });

      // Get selected quantity from quantity tier selector
      const quantitySelector = document.querySelector('.custom-quantity-selector');
      const selectedQuantityInput = quantitySelector?.querySelector('input[name="quantity_tier"]:checked');
      const selectedQuantity = selectedQuantityInput ? parseInt(selectedQuantityInput.value) || 1 : 1;

      // Intercept if rebuy products are selected OR if quantity is not 1
      if (selectedRebuyProducts.length > 0 || selectedQuantity !== 1) {
        e.preventDefault();
        e.stopPropagation();

        // Get main product variant ID from form
        const formData = new FormData(addToCartForm);
        const mainVariantId = formData.get('id');

        if (!mainVariantId) return;

        // Get main product name
        const mainProductTitleEl = document.querySelector('.product-single__title');
        const mainProductName = mainProductTitleEl?.textContent?.trim() || 'Product';

        // Show loading state
        addToCartButton.classList.add('btn--loading');
        addToCartButton.disabled = true;

        try {
          // Add main product with selected quantity
          const mainProductData = new URLSearchParams();
          mainProductData.append('id', mainVariantId);
          mainProductData.append('quantity', selectedQuantity);

          const mainResponse = await fetch(window.theme?.routes?.cartAdd || '/cart/add.js', {
            method: 'POST',
            body: mainProductData.toString(),
            credentials: 'same-origin',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'X-Requested-With': 'XMLHttpRequest'
            }
          });

          const mainResult = await mainResponse.json();

          if (mainResult.status === 422) {
            const errorMessage = mainResult.description || 'Failed to add product to cart';
            throw new Error(`${mainProductName}: ${errorMessage}`);
          }

          // Add rebuy products sequentially (always quantity of 1)
          for (const rebuyProduct of selectedRebuyProducts) {
            const rebuyData = new URLSearchParams();
            rebuyData.append('id', rebuyProduct.id);
            rebuyData.append('quantity', 1);

            const rebuyResponse = await fetch(window.theme?.routes?.cartAdd || '/cart/add.js', {
              method: 'POST',
              body: rebuyData.toString(),
              credentials: 'same-origin',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest'
              }
            });

            const rebuyResult = await rebuyResponse.json();

            if (rebuyResult.status === 422) {
              const errorMessage = rebuyResult.description || 'Failed to add product to cart';
              throw new Error(`${rebuyProduct.name}: ${errorMessage}`);
            }
          }

          // Dispatch custom event for cart update
          document.dispatchEvent(new CustomEvent('cart:updated'));

        } catch (error) {
          console.error('Error adding products to cart:', error);

          // Remove any existing error messages
          const existingErrors = addToCartForm.querySelector('.errors');
          if (existingErrors) {
            existingErrors.remove();
          }

          // Create and display error message below the buy button
          const errorDiv = document.createElement('div');
          errorDiv.classList.add('errors', 'text-center');
          errorDiv.textContent = error.description || error.message || 'There was an error adding products to cart. Please try again.';
          addToCartForm.append(errorDiv);
        } finally {
          addToCartButton.classList.remove('btn--loading');
          addToCartButton.disabled = false;
        }
      }
    }, true); // Use capture phase to intercept before theme handler
  };

  // Initialize add to cart with rebuy handler
  handleAddToCartWithRebuy();

  // Initialize Rebuy Recommendations Carousel
  const rebuyContainers = document.querySelectorAll('.rebuy-recommendations-container');

  rebuyContainers.forEach((container) => {
    // Hide container by default
    container.style.display = 'none';

    const rebuyDataSourceId = container.dataset.rebuyDataSourceId;
    const currentProductId = container.dataset.currentProductId;
    const rebuyApiKey = container.dataset.rebuyApiKey || "6e5aada6dd159d86183afb4ab961e8f0a794787c&format";
    const swiperWrapper = container.querySelector('.swiper-wrapper');
    const navigationContainer = container.querySelector('.swiper-navigation-container');

    if (!rebuyDataSourceId || !currentProductId || !swiperWrapper) {
      return;
    }

    // Load Swiper assets
    const loadSwiperAssets = () => {
      return new Promise((resolve, reject) => {
        if (window.Swiper) {
          resolve();
          return;
        }

        const linkEl = document.createElement('link');
        linkEl.rel = 'stylesheet';
        linkEl.href = 'https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.css';
        document.head.appendChild(linkEl);

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Swiper'));
        document.body.appendChild(script);
      });
    };

    // Fetch Rebuy data
    fetch(`https://rebuyengine.com/api/v1/custom/id/${rebuyDataSourceId}?key=${rebuyApiKey}&pretty&shopify_product_ids=${currentProductId}&limit=20`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const products = data.data || [];

        if (!products || products.length === 0) {
          // Keep container hidden if no products
          return;
        }

        // Show container when products are available
        container.style.display = '';
        container.classList.remove('hide');
        container.classList.add('show');

        // Render products
        swiperWrapper.innerHTML = products.map((product) => {
          const imageUrl = product.image?.src || product.images?.[0]?.src || '';
          const productUrl = product.url || `/products/${product.handle}`;
          const title = product.title || '';
          const variants = product.variants || [];

          // Get price - try multiple possible formats from Rebuy API
          let price = '';

          if (variants.length > 0 && variants[0].price) {
            price = variants[0].price;
          } else if (product.price_min) {
            price = product.price_min;
          } else if (product.price) {
            price = product.price;
          } else if (product.price_max) {
            price = product.price_max;
          }

          // Get compare price
          let comparePrice = '';

          if (variants.length > 0 && variants[0].compare_at_price) {
            comparePrice = variants[0].compare_at_price;
          } else if (product.compare_at_price_min) {
            comparePrice = product.compare_at_price_min;
          } else if (product.compare_at_price) {
            comparePrice = product.compare_at_price;
          }

          // Function to remove trailing zeros from price strings
          const removeTrailingZeros = (priceStr) => {
            if (!priceStr) return '';
            return priceStr.toString().replace(/\.00(\s|$|[^0-9])/g, '$1').replace(/(\d)\.(\d)0+(\s|$|[^0-9])/g, '$1.$2$3').replace(/\.00$/g, '').replace(/(\d)\.(\d)0+$/g, '$1.$2');
          };

          // Check availability - Rebuy API might use available, available_for_sale, or inventory_quantity
          const checkVariantAvailability = (variant) => {

            // Explicit false checks
            if (variant.available === false || variant.available === 0) return false;
            if (variant.available_for_sale === false || variant.available_for_sale === 0) return false;

            // Check inventory quantity (if tracking inventory and policy doesn't allow backorders)
            if (variant.inventory_quantity !== undefined && variant.inventory_quantity !== null) {
              if (variant.inventory_quantity <= 0 && variant.inventory_policy !== 'continue') {
                return false;
              }
            }

            // Explicit true checks
            if (variant.available === true || variant.available_for_sale === true) return true;

            // Check if available property exists and is truthy
            if (variant.available !== undefined) {
              return variant.available === true || variant.available === 1;
            }

            // If available_for_sale exists and is truthy
            if (variant.available_for_sale !== undefined) {
              return variant.available_for_sale === true || variant.available_for_sale === 1;
            }

            // Default: if we can't determine, assume available (to avoid false positives)
            return true;
          };

          // Find first available variant for initial selection
          const availableVariants = variants.filter(checkVariantAvailability);
          const firstAvailableVariant = availableVariants.length > 0 ? availableVariants[0] : variants[0];

          let variantSelect = '';
          if (variants.length > 1) {

            variantSelect = `
              <select class="rebuy-product-card__variant-select" data-product-id="${product.id}">
                ${variants.map((variant) => {
                  const variantPrice = variant.price || '';
                  const variantPriceFormatted = removeTrailingZeros(variantPrice);
                  const isAvailable = checkVariantAvailability(variant);
                  const isSelected = variant.id === firstAvailableVariant.id;
                  return `
                    <option value="${variant.id}" data-price="${variantPriceFormatted}" ${!isAvailable ? 'disabled' : ''} ${isSelected ? 'selected' : ''}>
                      ${variant.title}${!isAvailable ? ' (Sold Out)' : ''}
                    </option>
                  `;
                }).join('')}
              </select>
            `;
          }

          // Format price display - remove trailing zeros
          const priceDisplay = price ? removeTrailingZeros(price) : '';
          const comparePriceDisplay = comparePrice ? removeTrailingZeros(comparePrice) : '';

          return `
            <div class="swiper-slide">
              <div class="rebuy-product-card">
                <div class="rebuy-product-card__checkbox-wrapper">
                  <input type="checkbox"
                         class="rebuy-product-card__checkbox"
                         id="rebuy-product-${product.id}"
                         data-product-id="${product.id}"
                         data-product-price="${price}"
                         data-product-title="${title}"
                         data-variant-id="${variants.length > 0 ? firstAvailableVariant.id : ''}">
                  <label for="rebuy-product-${product.id}" class="rebuy-product-card__checkbox-label"></label>
                </div>
                <div class="rebuy-product-card__image">
                  <img src="${imageUrl}" alt="${title}" loading="lazy">
                </div>
                <div class="rebuy-product-card__info">
                  <h3 class="rebuy-product-card__title">
                    <a href="${productUrl}" class="rebuy-product-card__link">${title}</a>
                  </h3>
                  <div class="rebuy-product-card__price-container">
                    ${priceDisplay ? `<span class="rebuy-product-card__price">$${priceDisplay}</span>` : ''}
                    ${comparePriceDisplay && comparePriceDisplay !== priceDisplay ? `<span class="rebuy-product-card__compare-price">$${comparePriceDisplay}</span>` : ''}
                  </div>
                  ${variantSelect}
                </div>
              </div>
            </div>
          `;
        }).join('');

        // Initialize Swiper
        loadSwiperAssets().then(() => {
          if (!window.Swiper) {
            console.warn('Swiper library not loaded');
            return;
          }

          const swiperEl = container.querySelector('.rebuy-recommendations-swiper');
          const prevBtn = container.querySelector('.swiper-button-prev');
          const nextBtn = container.querySelector('.swiper-button-next');

          const swiper = new window.Swiper(swiperEl, {
            slidesPerView: 2.2,
            spaceBetween: 8,
            navigation: {
              nextEl: nextBtn,
              prevEl: prevBtn,
            },
            breakpoints: {
              640: {
                slidesPerView: 3,
                spaceBetween: 8,
              },
              769: {
                slidesPerView: 5,
                spaceBetween: 8,
              }
            }
          });

          // Show navigation if there are products
          if (products.length > 0 && navigationContainer) {
            navigationContainer.classList.add('has-products');
          }

          // Update navigation button states
          const updateNavStates = () => {
            if (prevBtn && nextBtn) {
              prevBtn.classList.toggle('swiper-button-disabled', swiper.isBeginning);
              nextBtn.classList.toggle('swiper-button-disabled', swiper.isEnd);
            }
          };

          swiper.on('slideChange', updateNavStates);
          updateNavStates();

          // Handle checkbox clicks (no integration with quantity selector)
          container.querySelectorAll('.rebuy-product-card__checkbox').forEach((checkbox) => {
            checkbox.addEventListener('change', function(e) {
              e.stopPropagation();
            });

            // Prevent label click from navigating
            const label = checkbox.nextElementSibling;
            if (label && label.classList.contains('rebuy-product-card__checkbox-label')) {
              label.addEventListener('click', function(e) {
                e.stopPropagation();
              });
            }
          });

          // Handle product card image clicks - toggle checkbox
          container.querySelectorAll('.rebuy-product-card__image').forEach((imageContainer) => {
            imageContainer.addEventListener('click', function(e) {
              e.stopPropagation();
              const productCard = this.closest('.rebuy-product-card');
              const checkbox = productCard?.querySelector('.rebuy-product-card__checkbox');

              if (checkbox) {
                // Toggle checkbox
                checkbox.checked = !checkbox.checked;
                // Trigger change event
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
              }
            });
          });

          // Handle product card link clicks - toggle checkbox instead of navigating
          container.querySelectorAll('.rebuy-product-card__link').forEach((link) => {
            link.addEventListener('click', function(e) {
              e.preventDefault();
              const productCard = this.closest('.rebuy-product-card');
              const checkbox = productCard?.querySelector('.rebuy-product-card__checkbox');

              if (checkbox) {
                // Toggle checkbox
                checkbox.checked = !checkbox.checked;
                // Trigger change event
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
              }
            });
          });

          // Handle variant selection changes
          container.querySelectorAll('.rebuy-product-card__variant-select').forEach((select) => {
            // Stop propagation for all events to prevent link navigation
            // But don't prevent default so the select can function normally
            const stopPropagation = (e) => {
              e.stopPropagation();
            };

            select.addEventListener('click', stopPropagation);
            select.addEventListener('mousedown', stopPropagation);
            select.addEventListener('pointerdown', stopPropagation);
            select.addEventListener('focus', stopPropagation);
            select.addEventListener('focusin', stopPropagation);

            select.addEventListener('change', function(e) {
              e.stopPropagation();
              const productCard = this.closest('.rebuy-product-card');
              const checkbox = productCard?.querySelector('.rebuy-product-card__checkbox');
              const priceEl = productCard?.querySelector('.rebuy-product-card__price');
              const selectedOption = this.options[this.selectedIndex];

              if (checkbox && selectedOption) {
                checkbox.setAttribute('data-variant-id', selectedOption.value);
                const variantPriceFormatted = selectedOption.getAttribute('data-price');
                if (variantPriceFormatted) {
                  // Store the raw price for calculations (remove $ if present)
                  const rawPrice = variantPriceFormatted.toString().replace(/^\$/, '');
                  checkbox.setAttribute('data-product-price', rawPrice);

                  // Update displayed price - format to match initial display (with $ prefix, no trailing zeros)
                  // The variantPriceFormatted from data-price is already formatted with removeTrailingZeros
                  // Match the format used on initial render: $${priceDisplay}
                  if (priceEl) {
                    const displayPrice = variantPriceFormatted.toString().startsWith('$')
                      ? variantPriceFormatted
                      : `$${variantPriceFormatted}`;
                    priceEl.textContent = displayPrice;
                  }
                }
              }
            });
          });
        });
      })
      .catch((err) => {
        console.error("Rebuy Error:", err);
        container.style.display = 'none';
      });
  });
});
