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
    return ['data-base-price', 'data-tier-one-discount', 'data-tier-two-discount', 'data-tier-three-discount', 'data-show-strike-total'];
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
      const radioButton = option.querySelector('input[type="radio"]');

      if (radioButton) {
        // Initialize accordion state for pre-checked radio button
        if (radioButton.checked) {
          this.openAccordionForOption(option);
        }

        // Handle radio button change
        radioButton.addEventListener('change', () => {
          if (radioButton.checked) {
            this.toggleAccordion(option);
          }
        });
      }
    });
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
        }
      });

      // Open the first accordion for this option
      if (accordions.length > 0) {
        this.openAccordion(accordions[0]);
        option.classList.add('is-open');
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
        this.processRebuyData(allRecommendedProducts, sliderContainers);
      })
      .catch((err) => {
        console.error("Rebuy Error:", err);
        sliderContainers.forEach((container) => {
          container.classList.add('no-data-showing-recommended');
        });
      });
  }

  /**
   * Process Rebuy data and populate sliders
   */
  processRebuyData(allRecommendedProducts, sliderContainers) {
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
            const radioButton = firstVisibleOption.querySelector('input[type="radio"]');
            if (radioButton) {
              radioButton.checked = true;
            }
            this.openAccordion(firstAccordion);
            firstVisibleOption.classList.add('is-open');
          }
        }
      }, 100);
    });
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
      selected: false
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

          this.updateRebuyTotal();
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
                this.rebuySelectedProducts[productKey].price = parseFloat(newPrice) || 0;
                if (checkbox.checked) {
                  this.updateRebuyTotal();
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

    // Get main product price
    const atcPriceEl = document.querySelector('.atc-price');
    const originalPrice = atcPriceEl ? (atcPriceEl.dataset.originalPrice || atcPriceEl.textContent.trim()) : '';
    const mainProductPrice = parseFloat(originalPrice.replace(/[^0-9.]/g, '')) || 0;

    // Calculate total including main product
    const total = mainProductPrice + rebuyTotal;

    // Update add to cart button
    const addToCartBtn = document.querySelector('[data-add-to-cart]');

    if (addToCartBtn && atcPriceEl) {
      const formattedTotal = '$' + total.toFixed(2);
      atcPriceEl.textContent = formattedTotal;
    }

    return selectedItems;
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
        swiperConfig.breakpoints[640] = { slidesPerView: 1, spaceBetween: 8 };
        swiperConfig.breakpoints[768] = { slidesPerView: 1, spaceBetween: 8 };
        swiperConfig.breakpoints[1024] = { slidesPerView: 1, spaceBetween: 8 };
      } else if (quantityIndex === 2) {
        swiperConfig.breakpoints[640] = { slidesPerView: 2, spaceBetween: 8 };
        swiperConfig.breakpoints[768] = { slidesPerView: 2, spaceBetween: 8 };
        swiperConfig.breakpoints[1024] = { slidesPerView: 2, spaceBetween: 8 };
      } else if (quantityIndex >= 3) {
        swiperConfig.breakpoints[640] = { slidesPerView: 2, spaceBetween: 8 };
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
