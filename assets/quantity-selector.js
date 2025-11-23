/**
 * Quantity Selector Web Component
 * Encapsulates quantity selection, accordion behavior, and Rebuy integration
 */
class QuantitySelector extends HTMLElement {
  constructor() {
    super();
    this.swiperLoadPromise = null;
    this.rebuySelectedProducts = window.rebuySelectedProducts || {};
    window.rebuySelectedProducts = this.rebuySelectedProducts;
  }

  static get observedAttributes() {
    return ['data-base-price'];
  }

  connectedCallback() {
    this.initializeAccordion();
    this.initializeRebuyIntegration();
    this.setupReinitializeListener();
  }

  /**
   * Setup listener for Swiper reinitialize events
   */
  setupReinitializeListener() {
    this.addEventListener('rebuy-reinitialize-swiper', (e) => {
      const container = e.detail.container;
      if (container) {
        this.initializeSwiper(container);
        // Ensure fade-in animation is applied
        setTimeout(() => {
          container.classList.remove('fading-out');
          container.classList.add('fading-in');
        }, 50);
      }
    });
  }

  disconnectedCallback() {
    // Cleanup if needed
    this.removeEventListeners();
  }

  /**
   * Initialize accordion functionality
   */
  initializeAccordion() {
    const quantityOptions = this.querySelectorAll('.quantity-option');

    quantityOptions.forEach((option) => {
      // Initialize accordion state for active option
      if (option.classList.contains('is-active')) {
          this.openAccordionForOption(option);
        // Update price on initial load
        setTimeout(() => {
          this.updateRebuyTotal();
        }, 100);
      }

      // Handle click on quantity option
      option.addEventListener('click', () => {
        this.selectQuantityOption(option);
      });

      // Handle keyboard navigation (Enter and Space)
      option.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectQuantityOption(option);
        }
      });
    });
  }

  /**
   * Select a quantity option and toggle accordion
   */
  selectQuantityOption(option) {
    // Remove active state from all options
    const allOptions = this.querySelectorAll('.quantity-option');
    allOptions.forEach((otherOption) => {
      otherOption.classList.remove('is-active');
      otherOption.setAttribute('aria-expanded', 'false');
    });

    // Set this option as active
    option.classList.add('is-active');
    option.setAttribute('aria-expanded', 'true');

    // Toggle accordion
    this.toggleAccordion(option);

    // Update the atc-price when quantity option changes
    this.updateRebuyTotal();
  }

  /**
   * Toggle accordion for a specific option
   */
  toggleAccordion(option) {
    // Find all accordions associated with this option
    const accordions = [];
    let nextSibling = option.nextElementSibling;
    while (nextSibling && nextSibling.classList.contains('quantity-selector-accordion')) {
      accordions.push(nextSibling);
      nextSibling = nextSibling.nextElementSibling;
    }

    if (accordions.length === 0) {
      return;
    }

    // Check if any accordion is open
    const hasOpenAccordion = accordions.some(acc => acc.classList.contains('is-open'));

    if (hasOpenAccordion) {
      // Close all accordions for this option
      accordions.forEach(acc => {
        acc.classList.remove('is-open');
        acc.style.maxHeight = null;
      });
      option.classList.remove('is-open');
      option.setAttribute('aria-expanded', 'false');
    } else {
      // Close all other accordions from other options
      const allOptions = this.querySelectorAll('.quantity-option');
      allOptions.forEach((otherOption) => {
        if (otherOption !== option) {
          let otherNextSibling = otherOption.nextElementSibling;
          while (otherNextSibling && otherNextSibling.classList.contains('quantity-selector-accordion')) {
            otherNextSibling.classList.remove('is-open');
            otherNextSibling.style.maxHeight = null;
            otherNextSibling = otherNextSibling.nextElementSibling;
          }
          otherOption.classList.remove('is-open');
          otherOption.setAttribute('aria-expanded', 'false');
        }
      });

      // Open the first accordion for this option
      if (accordions.length > 0) {
        this.openAccordion(accordions[0]);
        option.classList.add('is-open');
        option.setAttribute('aria-expanded', 'true');
      }
    }
  }

  /**
   * Open accordion for a specific option
   */
  openAccordionForOption(option) {
    const accordions = [];
    let nextSibling = option.nextElementSibling;
    while (nextSibling && nextSibling.classList.contains('quantity-selector-accordion')) {
      accordions.push(nextSibling);
      nextSibling = nextSibling.nextElementSibling;
    }

    if (accordions.length > 0 && !accordions[0].classList.contains('hidden')) {
      this.openAccordion(accordions[0]);
      option.classList.add('is-open');
      option.setAttribute('aria-expanded', 'true');
    }
  }

  /**
   * Open a specific accordion
   */
  openAccordion(accordion) {
    accordion.classList.add('is-open');
    const navHeight = accordion.querySelector('.swiper-navigation-container')?.offsetHeight || 50;
    accordion.style.maxHeight = (accordion.scrollHeight + navHeight) + 'px';

    // Reinitialize Swiper if content exists
    setTimeout(() => {
      this.reinitializeSwiperInAccordion(accordion);
    }, 100);
  }

  /**
   * Reinitialize Swiper in accordion
   */
  reinitializeSwiperInAccordion(accordionContent) {
    const sliderContainer = accordionContent.querySelector('.recommended-product-slider');
    if (!sliderContainer) return;

    const swiperWrapper = sliderContainer.querySelector('.swiper-wrapper');
    if (!swiperWrapper || !swiperWrapper.innerHTML.trim()) return;

    const swiperEl = sliderContainer.querySelector('.rebuy-recommendations-swiper');
    if (!swiperEl || swiperEl.swiperInstance) return;

    // Start with opacity 0, then fade in after initialization
    sliderContainer.classList.remove('fading-out');
    sliderContainer.classList.add('fading-in');

    // Trigger custom event to reinitialize Swiper
    const event = new CustomEvent('rebuy-reinitialize-swiper', {
      detail: { container: sliderContainer },
      bubbles: true
    });
    this.dispatchEvent(event);
  }

  /**
   * Initialize Rebuy integration
   */
  initializeRebuyIntegration() {
    const rebuyDataSourceId = this.dataset.rebuyDataSourceId;
    const currentProductId = this.dataset.currentProductId;
    const rebuyApiKey = this.dataset.rebuyApiKey || "6e5aada6dd159d86183afb4ab961e8f0a794787c&format";
    const sliderContainers = this.querySelectorAll('.recommended-product-slider');

    if (!rebuyDataSourceId || !currentProductId || sliderContainers.length === 0) {
      // Hide header and selector if no containers
      this.toggleQuantitySelectorVisibility(false);
      return;
    }

    // Fetch Rebuy data
    fetch(`https://rebuyengine.com/api/v1/custom/id/${rebuyDataSourceId}?key=${rebuyApiKey}&pretty&shopify_product_ids=${currentProductId}&limit=100`, {
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
        const allRecommendedProducts = data.data || [];
        // If no products at all, hide immediately
        if (!allRecommendedProducts || allRecommendedProducts.length === 0) {
          this.toggleQuantitySelectorVisibility(false);
          return;
        }
        this.processRebuyData(allRecommendedProducts, sliderContainers);
      })
      .catch((err) => {
        console.error("Rebuy Error:", err);
        sliderContainers.forEach((container) => {
          container.classList.add('no-data-showing-recommended');
        });
        // Hide header and selector on error (no results)
        this.toggleQuantitySelectorVisibility(false);
      });
  }

  /**
   * Process Rebuy data and populate sliders
   */
  processRebuyData(allRecommendedProducts, sliderContainers) {
    let hasAnyProducts = false;

    sliderContainers.forEach((container) => {
      const tierCategory = container.dataset.category || '';
      const quantityIndex = parseInt(container.dataset.quantityIndex) || 1;
      const accordion = container.closest('.quantity-selector-accordion');
      const quantityOption = accordion ? accordion.previousElementSibling : null;

      let recommendedProducts = allRecommendedProducts;

      // Normalize product_type for comparison
      const normalizeProductType = (productType) => {
        if (!productType) return 'Uncategorized';
        const normalized = productType.toLowerCase().trim();
        if (normalized.endsWith('s') && normalized.length > 1) {
          return normalized.slice(0, -1);
        }
        return normalized;
      };

      // Filter by product_type if configured
      if (tierCategory && tierCategory.trim() !== '') {
        const normalizedTierCategory = normalizeProductType(tierCategory);
        recommendedProducts = allRecommendedProducts.filter(product => {
          const productType = product.product_type || '';
          const normalizedProductType = normalizeProductType(productType);
          return normalizedProductType === normalizedTierCategory;
        });
      }

      if (recommendedProducts.length === 0) {
        if (accordion) {
          accordion.classList.add('hidden');
          if (quantityOption && quantityOption.classList.contains('quantity-option')) {
            quantityOption.classList.add('hidden');
          }
        }
        return;
      }

      // Mark that we have products
      hasAnyProducts = true;

      // Group products by normalized product_type
      const groupedByProductType = recommendedProducts.reduce((acc, product) => {
        const productType = product.product_type || 'Uncategorized';
        const normalizedType = normalizeProductType(productType);
        if (!acc[normalizedType]) {
          acc[normalizedType] = {
            displayName: productType,
            products: []
          };
        }
        acc[normalizedType].products.push(product);
        return acc;
      }, {});

      // Remove existing accordion and create new ones
      if (accordion) {
        accordion.remove();
      }

      // Create a new accordion for each product_type
      Object.keys(groupedByProductType).forEach((normalizedType, index) => {
        const group = groupedByProductType[normalizedType];
        const products = group.products;
        const productType = group.displayName;
        if (products.length === 0) return;

        const newAccordion = this.createAccordion(quantityIndex, productType, tierCategory, products, quantityOption);
        this.setupAccordionEventHandlers(newAccordion);
        this.initializeSwiper(newAccordion.querySelector('.recommended-product-slider'));
      });

      // Open the first visible accordion after rendering
      setTimeout(() => {
        const allQuantityOptions = this.querySelectorAll('.quantity-option:not(.hidden)');
        if (allQuantityOptions.length > 0) {
          const firstVisibleOption = allQuantityOptions[0];
          let nextSibling = firstVisibleOption.nextElementSibling;
          let firstAccordion = null;

          while (nextSibling) {
            if (nextSibling.classList.contains('quantity-selector-accordion') &&
                !nextSibling.classList.contains('hidden')) {
              firstAccordion = nextSibling;
              break;
            }
            nextSibling = nextSibling.nextElementSibling;
          }

          if (firstAccordion) {
            firstVisibleOption.classList.add('is-active');
            firstVisibleOption.setAttribute('aria-expanded', 'true');
            this.openAccordion(firstAccordion);
            firstVisibleOption.classList.add('is-open');
            // Update price after setting first visible option
            this.updateRebuyTotal();
          }
        }
      }, 100);
    });

    // Show/hide header and selector based on whether we have any products
    this.toggleQuantitySelectorVisibility(hasAnyProducts);
  }

  /**
   * Toggle visibility of quantity header and selector based on results
   */
  toggleQuantitySelectorVisibility(hasResults) {
    // Find the quantity header (sibling of the quantity-selector element)
    const quantityHeader = this.previousElementSibling;
    if (quantityHeader && quantityHeader.classList.contains('product-block--quantity-header')) {
      if (hasResults) {
        quantityHeader.classList.add('has-results');
      } else {
        quantityHeader.classList.remove('has-results');
      }
    }

    // Find and toggle top border (before quantity header)
    let currentSibling = this.previousElementSibling;
    while (currentSibling) {
      if (currentSibling.classList.contains('top-border-upsell')) {
        if (hasResults) {
          currentSibling.classList.add('has-results');
        } else {
          currentSibling.classList.remove('has-results');
        }
        break;
      }
      currentSibling = currentSibling.previousElementSibling;
    }

    // Find and toggle bottom border (after quantity selector)
    let nextSibling = this.nextElementSibling;
    while (nextSibling) {
      if (nextSibling.classList.contains('bottom-border-upsell')) {
        if (hasResults) {
          nextSibling.classList.add('has-results');
        } else {
          nextSibling.classList.remove('has-results');
        }
        break;
      }
      nextSibling = nextSibling.nextElementSibling;
    }

    // Show/hide the quantity selector itself
    if (hasResults) {
      this.classList.add('has-results');
    } else {
      this.classList.remove('has-results');
    }
  }

  /**
   * Create accordion element
   */
  createAccordion(quantityIndex, productType, tierCategory, products, quantityOption) {
    const newAccordion = document.createElement('div');
    newAccordion.className = 'quantity-selector-accordion';
    newAccordion.setAttribute('data-product-type', productType);
    newAccordion.setAttribute('data-quantity-index', quantityIndex);

    const newSlider = document.createElement('div');
    newSlider.className = 'recommended-product-slider';
    newSlider.setAttribute('data-quantity-index', quantityIndex);
    newSlider.setAttribute('data-product-type', productType);
    newSlider.setAttribute('data-category', tierCategory);

    const newSwiper = document.createElement('div');
    newSwiper.className = 'rebuy-recommendations-swiper swiper';

    const newWrapper = document.createElement('div');
    newWrapper.className = 'swiper-wrapper';
    newWrapper.innerHTML = products.map(product => this.createProductCard(product)).join('');

    const navContainer = this.createNavigationContainer();
    newSwiper.appendChild(newWrapper);
    newSlider.appendChild(newSwiper);
    newSlider.appendChild(navContainer);
    newAccordion.appendChild(newSlider);

    // Insert after the quantity option label
    if (quantityOption && quantityOption.nextSibling) {
      quantityOption.parentNode.insertBefore(newAccordion, quantityOption.nextSibling);
    } else if (quantityOption) {
      quantityOption.parentNode.appendChild(newAccordion);
    }

    // Remove hidden class if there's data
    if (quantityOption && quantityOption.classList.contains('quantity-option')) {
      quantityOption.classList.remove('hidden');
    }
    newAccordion.classList.remove('hidden');

    return newAccordion;
  }

  /**
   * Create navigation container
   */
  createNavigationContainer() {
    const navContainer = document.createElement('div');
    navContainer.className = 'swiper-navigation-container';

    const prevButton = document.createElement('div');
    prevButton.className = 'swiper-button-prev';
    prevButton.innerHTML = `
      <svg width="15" height="12" viewBox="0 0 15 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13.8999 5.8999H0.899902M0.899902 5.8999L5.7749 0.899902M0.899902 5.8999L5.7749 10.8999" stroke="black" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    const nextButton = document.createElement('div');
    nextButton.className = 'swiper-button-next';
    nextButton.innerHTML = `
      <svg width="15" height="12" viewBox="0 0 15 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0.899902 5.8999H13.8999M13.8999 5.8999L9.0249 0.899902M13.8999 5.8999L9.0249 10.8999" stroke="black" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    navContainer.appendChild(prevButton);
    navContainer.appendChild(nextButton);

    return navContainer;
  }

  /**
   * Create product card HTML
   */
  createProductCard(product) {
    const productId = product.id || product.product_id || '';
    const productTitle = product.title || 'Product';
    const productUrl = product.url || `/products/${product.handle}`;
    const variants = product.variants || [];
    const hasVariants = variants.length > 1;

    let defaultVariant = variants.find(v => v.available !== false) || variants[0] || product;
    const defaultImageUrl = defaultVariant.image?.src || defaultVariant.featured_image || product.image?.src || product.featured_image || 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-product.svg';
    const defaultPrice = defaultVariant.price || product.price || '0.00';
    const defaultComparePrice = defaultVariant.compare_at_price || null;
    const defaultVariantId = defaultVariant.id || defaultVariant.variant_id || '';

    let variantOptionsHtml = '';
    if (hasVariants) {
      variantOptionsHtml = variants.map(variant => {
        const variantTitle = variant.title || variant.option1 || 'Default';
        const variantId = variant.id || variant.variant_id || '';
        const isAvailable = variant.available !== false;
        return `<option value="${variantId}" ${variantId === defaultVariantId ? 'selected' : ''} ${!isAvailable ? 'disabled' : ''}>${variantTitle}</option>`;
      }).join('');
    }

    // Store product data for tracking
    const productKey = `product-${productId}-${defaultVariantId}`;
    this.rebuySelectedProducts[productKey] = {
      productId: productId,
      variantId: defaultVariantId,
      price: defaultPrice,
      selected: false,
      productData: {
        id: productId,
        title: productTitle,
        url: productUrl,
        image: defaultImageUrl,
        variant: defaultVariant,
        variants: variants
      }
    };

    return `
      <div class="swiper-slide rebuy-product-card" data-product-id="${productId}" data-product-key="${productKey}">
        <div class="rebuy-product-card__checkbox-wrapper">
          <input type="checkbox" class="rebuy-product-card__checkbox" id="rebuy-product-${productId}" data-product-id="${productId}" data-variant-id="${defaultVariantId}" data-product-key="${productKey}">
          <label for="rebuy-product-${productId}" class="rebuy-product-card__checkbox-label"></label>
        </div>
        <div class="rebuy-product-card__image">
          <img src="${defaultImageUrl}" alt="${productTitle}" loading="lazy" data-default-image="${defaultImageUrl}">
        </div>
        <div class="rebuy-product-card__info">
          <a href="${productUrl}" class="rebuy-product-card__link">
            <h3 class="rebuy-product-card__title">${productTitle}</h3>
          </a>
          <div class="rebuy-product-card__price-container">
            <span class="rebuy-product-card__price" data-price="${defaultPrice}">$${defaultPrice}</span>
            ${defaultComparePrice ? `<span class="rebuy-product-card__compare-price" data-compare-price="${defaultComparePrice}">$${defaultComparePrice}</span>` : ''}
          </div>
          ${hasVariants ? `
            <select class="rebuy-product-card__variant-select" data-product-id="${productId}" aria-label="Variant of ${productTitle}">
              ${variantOptionsHtml}
            </select>
          ` : ''}
        </div>
        <div class="rebuy-product-variants-data" style="display: none;" data-variants='${JSON.stringify(variants).replace(/'/g, "&#39;")}'></div>
      </div>
    `;
  }

  /**
   * Setup event handlers for accordion
   */
  setupAccordionEventHandlers(accordion) {
    const wrapper = accordion.querySelector('.swiper-wrapper');
    if (!wrapper) return;

    const productCards = wrapper.querySelectorAll('.rebuy-product-card');
    productCards.forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.rebuy-product-card__link') || e.target.closest('.rebuy-product-card__variant-select')) {
          return;
        }
        if (e.target.closest('.rebuy-product-card__checkbox-wrapper')) {
          return;
        }
        const checkbox = card.querySelector('.rebuy-product-card__checkbox');
        if (checkbox) {
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event('change'));
        }
      });
    });

    const checkboxes = wrapper.querySelectorAll('.rebuy-product-card__checkbox');
    const checkboxLabels = wrapper.querySelectorAll('.rebuy-product-card__checkbox-label');

    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      checkbox.addEventListener('change', () => {
        const productKey = checkbox.dataset.productKey;
        const variantId = checkbox.dataset.variantId;
        const card = checkbox.closest('.rebuy-product-card');
        const priceEl = card.querySelector('.rebuy-product-card__price');

        if (productKey && this.rebuySelectedProducts[productKey]) {
          this.rebuySelectedProducts[productKey].selected = checkbox.checked;
          this.rebuySelectedProducts[productKey].variantId = variantId;

          if (priceEl) {
            const price = priceEl.getAttribute('data-price') || priceEl.textContent.replace('$', '');
            this.rebuySelectedProducts[productKey].price = parseFloat(price) || 0;
          }

          // Update product data variant and image if changed
          if (checkbox.checked && this.rebuySelectedProducts[productKey].productData) {
            const variantsDataEl = card.querySelector('.rebuy-product-variants-data');
            if (variantsDataEl) {
              try {
                const variants = JSON.parse(variantsDataEl.getAttribute('data-variants'));
                const selectedVariant = variants.find(v => (v.id || v.variant_id) == variantId);
                if (selectedVariant) {
                  this.rebuySelectedProducts[productKey].productData.variant = selectedVariant;
                  const imageEl = card.querySelector('.rebuy-product-card__image img');
                  if (imageEl && selectedVariant.image?.src) {
                    this.rebuySelectedProducts[productKey].productData.image = selectedVariant.image.src;
                  } else if (imageEl) {
                    this.rebuySelectedProducts[productKey].productData.image = imageEl.src || imageEl.dataset.src || '';
                  }
                }
              } catch (e) {
                console.error('Error parsing variant data:', e);
              }
            }
          }

          this.updateRebuyTotal();
          this.updateProductAddonResults();
        }
      });
    });

    checkboxLabels.forEach(label => {
      label.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const checkbox = label.previousElementSibling;
        if (checkbox && checkbox.type === 'checkbox') {
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event('change'));
        }
      });
    });

    const variantSelects = wrapper.querySelectorAll('.rebuy-product-card__variant-select');
    variantSelects.forEach(select => {
      select.addEventListener('change', () => {
        const card = select.closest('.rebuy-product-card');
        const variantId = select.value;
        const variantsDataEl = card.querySelector('.rebuy-product-variants-data');

        if (!variantsDataEl) return;

        try {
          const variants = JSON.parse(variantsDataEl.getAttribute('data-variants'));
          const selectedVariant = variants.find(v => (v.id || v.variant_id) == variantId);

          if (selectedVariant) {
            const imageEl = card.querySelector('.rebuy-product-card__image img');
            if (imageEl && selectedVariant.image?.src) {
              imageEl.src = selectedVariant.image.src;
            }

            const priceEl = card.querySelector('.rebuy-product-card__price');
            const comparePriceEl = card.querySelector('.rebuy-product-card__compare-price');

            if (priceEl && selectedVariant.price) {
              const newPrice = selectedVariant.price;
              priceEl.textContent = '$' + newPrice;
              priceEl.setAttribute('data-price', newPrice);
            }

            if (selectedVariant.compare_at_price) {
              const newComparePrice = selectedVariant.compare_at_price;
              if (comparePriceEl) {
                comparePriceEl.textContent = '$' + newComparePrice;
                comparePriceEl.setAttribute('data-compare-price', newComparePrice);
                comparePriceEl.style.display = '';
              } else if (priceEl) {
                const priceContainer = priceEl.closest('.rebuy-product-card__price-container');
                if (priceContainer) {
                  const newCompareEl = document.createElement('span');
                  newCompareEl.className = 'rebuy-product-card__compare-price';
                  newCompareEl.textContent = '$' + newComparePrice;
                  newCompareEl.setAttribute('data-compare-price', newComparePrice);
                  priceContainer.insertBefore(newCompareEl, priceEl);
                }
              }
            } else if (comparePriceEl) {
              comparePriceEl.style.display = 'none';
            }

            const checkbox = card.querySelector('.rebuy-product-card__checkbox');
            if (checkbox) {
              checkbox.setAttribute('data-variant-id', variantId);
              const productKey = checkbox.dataset.productKey;
              if (productKey && this.rebuySelectedProducts[productKey]) {
                this.rebuySelectedProducts[productKey].variantId = variantId;
                const priceValue = parseFloat(newPrice) || 0;
                this.rebuySelectedProducts[productKey].price = priceValue;

                // Update product data for results container
                if (this.rebuySelectedProducts[productKey].productData) {
                  this.rebuySelectedProducts[productKey].productData.variant = selectedVariant;
                  this.rebuySelectedProducts[productKey].productData.image = selectedVariant.image?.src || imageEl?.src || this.rebuySelectedProducts[productKey].productData.image || '';
                }

                if (checkbox.checked) {
                  this.updateRebuyTotal();
                  this.updateProductAddonResults();
                }
              }
            }
          }
        } catch (e) {
          console.error('Error parsing variant data:', e);
        }
      });
    });
  }

  /**
   * Update Rebuy total
   */
  updateRebuyTotal() {
    let rebuyTotal = 0;
    const selectedItems = [];

    Object.values(this.rebuySelectedProducts).forEach(item => {
      if (item.selected) {
        const price = parseFloat(item.price) || 0;
        rebuyTotal += price;
        selectedItems.push({
          id: item.variantId,
          quantity: 1,
          price: price
        });
      }
    });

    // Get main product original price (before discount)
    const activeQuantityOption = this.querySelector('.quantity-option.is-active');
    let originalMainProductPrice = 0;

    if (activeQuantityOption) {
      const originalPrice = activeQuantityOption.getAttribute('data-original-price');
      if (originalPrice) {
        // Shopify prices are in cents, convert to dollars
        originalMainProductPrice = (parseFloat(originalPrice) || 0) / 100;
      } else {
        // Fallback to displayed price
        const priceEl = activeQuantityOption.querySelector('.quantity-option__price');
        if (priceEl) {
          const priceText = priceEl.textContent.trim();
          originalMainProductPrice = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
        }
      }
    } else {
      // Fallback to atc-price if no active quantity option
    const atcPriceEl = document.querySelector('.atc-price');
    const originalPrice = atcPriceEl ? (atcPriceEl.dataset.originalPrice || atcPriceEl.textContent.trim()) : '';
      originalMainProductPrice = parseFloat(originalPrice.replace(/[^0-9.]/g, '')) || 0;
    }

    // Calculate original total (before discount)
    const originalTotal = originalMainProductPrice + rebuyTotal;

    // Count selected addons only (discounts only apply when addons are selected)
    const selectedAddonsCount = Object.values(this.rebuySelectedProducts).filter(item => item.selected).length;

    // Determine which tier they're in and get discount percentage
    // Discounts only apply when addons are selected:
    // 0 addons = no discount
    // 1 addon = Tier 1
    // 2 addons = Tier 2
    // 3+ addons = Tier 3
    let tierDiscountPercent = 0;
    if (selectedAddonsCount === 0) {
      // No discount when no addons are selected
      tierDiscountPercent = 0;
    } else if (selectedAddonsCount === 1) {
      // Tier 1: 1 addon selected
      const tier1Discount = this.getAttribute('data-tier-1-discount') || '0';
      tierDiscountPercent = parseFloat(tier1Discount) || 0;
    } else if (selectedAddonsCount === 2) {
      // Tier 2: 2 addons selected
      const tier2Discount = this.getAttribute('data-tier-2-discount') || '0';
      tierDiscountPercent = parseFloat(tier2Discount) || 0;
    } else if (selectedAddonsCount >= 3) {
      // Tier 3: 3 or more addons selected
      const tier3Discount = this.getAttribute('data-tier-3-discount') || '0';
      tierDiscountPercent = parseFloat(tier3Discount) || 0;
    }

    // Calculate discounted total based on tier discount
    const discountAmount = originalTotal * (tierDiscountPercent / 100);
    const total = originalTotal - discountAmount;

    // Update add to cart button price
    const atcPriceEl = document.querySelector('.atc-price');
    const atcPriceOriginalEl = document.querySelector('.atc-price-original');
    const addToCartBtn = document.querySelector('[data-add-to-cart]');
    const atcDiscountBadge = document.querySelector('.atc-discount-badge');

    if (addToCartBtn && atcPriceEl) {
      // Store original price if not already stored
      if (!atcPriceEl.dataset.originalPrice) {
        const currentText = atcPriceEl.textContent.trim();
        const currentPrice = parseFloat(currentText.replace(/[^0-9.]/g, '')) || 0;
        if (currentPrice > 0) {
          atcPriceEl.dataset.originalPrice = currentText;
        }
      }

      // Update prices
      const formattedOriginalTotal = '$' + originalTotal.toFixed(2);
      const formattedDiscountedTotal = '$' + total.toFixed(2);

      // Show original price (crossed out) if there's a discount
      if (atcPriceOriginalEl) {
        if (total < originalTotal && tierDiscountPercent > 0) {
          atcPriceOriginalEl.textContent = formattedOriginalTotal;
          atcPriceOriginalEl.classList.remove('hidden');
        } else {
          atcPriceOriginalEl.classList.add('hidden');
        }
      }

      // Update discounted price
      atcPriceEl.textContent = formattedDiscountedTotal;

      // Update discount badge
      if (atcDiscountBadge) {
        const badgeText = atcDiscountBadge.querySelector('.atc-discount-badge__text');
        if (tierDiscountPercent > 0 && badgeText) {
          badgeText.textContent = `${Math.round(tierDiscountPercent)}% OFF`;
          atcDiscountBadge.classList.remove('hidden');
        } else {
          atcDiscountBadge.classList.add('hidden');
        }
      }
    }

    return selectedItems;
  }

  /**
   * Update product addon results container
   */
  updateProductAddonResults() {
    // This function is kept for compatibility but no longer needs to do anything
    // since we removed the results container and moved everything to the button
  }


  /**
   * Create product card for results container
   */
  createResultsProductCard(product) {
    const card = document.createElement('div');
    card.className = 'rebuy-product-card rebuy-product-card--results';
    card.setAttribute('data-product-id', product.id);
    if (product.productKey) {
      card.setAttribute('data-product-key', product.productKey);
    }

    const imageUrl = product.image || 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-product.svg';
    const price = parseFloat(product.price) || 0;
    const comparePrice = product.variant?.compare_at_price || null;

    // Create image container
    const imageContainer = document.createElement('div');
    imageContainer.className = 'rebuy-product-card__image';
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = product.title;
    img.loading = 'lazy';
    imageContainer.appendChild(img);

    // Create info container
    const infoContainer = document.createElement('div');
    infoContainer.className = 'rebuy-product-card__info';

    // Create link and title
    const link = document.createElement('a');
    link.href = product.url;
    link.className = 'rebuy-product-card__link';
    const title = document.createElement('h3');
    title.className = 'rebuy-product-card__title';
    title.textContent = product.title;
    link.appendChild(title);

    // Create price container
    const priceContainer = document.createElement('div');
    priceContainer.className = 'rebuy-product-card__price-container';
    const priceSpan = document.createElement('span');
    priceSpan.className = 'rebuy-product-card__price';
    priceSpan.textContent = '$' + price.toFixed(2);
    priceContainer.appendChild(priceSpan);

    if (comparePrice) {
      const comparePriceSpan = document.createElement('span');
      comparePriceSpan.className = 'rebuy-product-card__compare-price';
      comparePriceSpan.textContent = '$' + parseFloat(comparePrice).toFixed(2);
      priceContainer.appendChild(comparePriceSpan);
    }

    infoContainer.appendChild(link);
    infoContainer.appendChild(priceContainer);

    // Add remove button for addons only
    if (!product.isMainProduct && product.productKey) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'rebuy-product-card__remove';
      removeBtn.setAttribute('data-product-key', product.productKey);
      removeBtn.setAttribute('aria-label', `Remove ${product.title}`);
      removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.removeAddonFromResults(product.productKey);
      });
      infoContainer.appendChild(removeBtn);
    }

    card.appendChild(imageContainer);
    card.appendChild(infoContainer);

    return card;
  }

  /**
   * Remove addon from results
   */
  removeAddonFromResults(productKey) {
    if (!productKey || !this.rebuySelectedProducts[productKey]) return;

    // Find and uncheck the checkbox in the slider
    const checkbox = this.querySelector(`.rebuy-product-card__checkbox[data-product-key="${productKey}"]`);
    if (checkbox) {
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change'));
    }

    // Update the selected state
    this.rebuySelectedProducts[productKey].selected = false;
    this.updateRebuyTotal();
    this.updateProductAddonResults();
  }


  /**
   * Load Swiper assets
   */
  loadSwiperAssets() {
    if (window.Swiper) {
      return Promise.resolve();
    }

    if (this.swiperLoadPromise) {
      return this.swiperLoadPromise;
    }

    this.swiperLoadPromise = new Promise((resolve) => {
      const linkEl = document.createElement('link');
      linkEl.rel = 'stylesheet';
      linkEl.href = 'https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.css';
      document.head.appendChild(linkEl);

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => resolve();
      document.head.appendChild(script);
    });

    return this.swiperLoadPromise;
  }

  /**
   * Initialize Swiper
   */
  initializeSwiper(container) {
    if (!container) return;

    const swiperEl = container.querySelector('.rebuy-recommendations-swiper');
    if (!swiperEl) return;

    if (swiperEl.dataset.initialized) return;

    swiperEl.dataset.initialized = 'true';
    const quantityIndex = parseInt(container.dataset.quantityIndex) || 1;
    const slidesPerView = quantityIndex;

    this.loadSwiperAssets().then(() => {
      if (!window.Swiper) {
        console.warn('Swiper library not loaded');
        return;
      }

      // Get slides for loop check and navigation visibility
      const slides = swiperEl.querySelectorAll('.swiper-slide');
      const slideCount = slides.length;
      const canLoop = slideCount >= 2;

      const swiperConfig = {
        slidesPerView: Math.min(slidesPerView, 1.2),
        spaceBetween: 8,
        loop: canLoop,
        touchEventsTarget: 'container',
        touchRatio: 1,
        touchAngle: 45,
        grabCursor: true,
        loop: true,
        allowTouchMove: true,
        watchOverflow: true,
        resistance: true,
        resistanceRatio: 0,
        navigation: {
          nextEl: container.querySelector('.swiper-button-next'),
          prevEl: container.querySelector('.swiper-button-prev'),
        },
        breakpoints: {}
      };

      if (quantityIndex === 1) {
        swiperConfig.breakpoints[640] = { slidesPerView: 1, spaceBetween: 4 };
        swiperConfig.breakpoints[768] = { slidesPerView: 1, spaceBetween: 8 };
        swiperConfig.breakpoints[1024] = { slidesPerView: 1, spaceBetween: 8 };
      } else if (quantityIndex === 2) {
        swiperConfig.breakpoints[640] = { slidesPerView: 2, spaceBetween: 4 };
        swiperConfig.breakpoints[768] = { slidesPerView: 2, spaceBetween: 8 };
        swiperConfig.breakpoints[1024] = { slidesPerView: 2, spaceBetween: 8 };
      } else if (quantityIndex >= 3) {
        swiperConfig.breakpoints[640] = { slidesPerView: 2, spaceBetween: 4 };
        swiperConfig.breakpoints[768] = { slidesPerView: 3, spaceBetween: 8 };
        swiperConfig.breakpoints[1024] = { slidesPerView: 3, spaceBetween: 8 };
      }

      const swiperInstance = new window.Swiper(swiperEl, swiperConfig);
      swiperEl.swiperInstance = swiperInstance;

      // Show navigation only if there are 5 or more products
      const navContainer = container.querySelector('.swiper-navigation-container');
      const hasProducts = slides.length > 0;
      const hasEnoughProducts = slides.length >= 5;
      const accordion = container.closest('.quantity-selector-accordion');

      if (navContainer && hasProducts && hasEnoughProducts) {
        navContainer.classList.add('has-products');
        if (accordion) {
          accordion.classList.add('has-nav');
        }
      } else {
        if (navContainer) {
          navContainer.classList.remove('has-products');
        }
        if (accordion) {
          accordion.classList.remove('has-nav');
        }
      }

      // Fade in after initialization
      setTimeout(() => {
        container.classList.remove('fading-out');
        container.classList.add('fading-in');
      }, 50);
    });
  }

  /**
   * Remove event listeners (cleanup)
   */
  removeEventListeners() {
    // Event listeners are automatically cleaned up when element is removed
    // But we can add specific cleanup here if needed
  }
}

// Register the custom element
customElements.define('quantity-selector', QuantitySelector);
