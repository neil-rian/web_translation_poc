/* ============================================================
   KATURE DECORATORS - JavaScript
   Navigation, reveal animations, filtering, form validation,
   slider controls, and pointer motion
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    // ============================
    // NAVBAR - Scroll behavior
    // ============================
    const navbar = document.getElementById('navbar');
    const heroSection = document.getElementById('hero');
    const scrollCue = document.querySelector('.hero__scroll-cue');

    function handleNavbarScroll() {
        const scrollY = window.scrollY;

        if (navbar) {
            navbar.classList.toggle('scrolled', scrollY > 60);
        }

        if (scrollCue) {
            if (scrollY > 30) {
                scrollCue.style.opacity = '0';
                scrollCue.style.pointerEvents = 'none';
            } else {
                scrollCue.style.opacity = '1';
                scrollCue.style.pointerEvents = '';
            }
        }
    }

    window.addEventListener('scroll', handleNavbarScroll, { passive: true });
    handleNavbarScroll();

    // ============================
    // MOBILE MENU
    // ============================
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const navLinks = document.getElementById('navLinks');
    const brandDropdown = document.getElementById('brandDropdown');
    const brandDropdownToggle = document.getElementById('brandDropdownToggle');

    if (hamburgerBtn && navLinks) {
        hamburgerBtn.addEventListener('click', () => {
            hamburgerBtn.classList.toggle('active');
            navLinks.classList.toggle('open');
            document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
        });

        navLinks.querySelectorAll('.nav-link').forEach((link) => {
            link.addEventListener('click', () => {
                if (link.classList.contains('nav-dropdown__toggle')) return;
                hamburgerBtn.classList.remove('active');
                navLinks.classList.remove('open');
                document.body.style.overflow = '';
            });
        });

        document.addEventListener('click', (event) => {
            if (
                navLinks.classList.contains('open') &&
                !navLinks.contains(event.target) &&
                !hamburgerBtn.contains(event.target)
            ) {
                hamburgerBtn.classList.remove('active');
                navLinks.classList.remove('open');
                document.body.style.overflow = '';
            }
        });
    }

    if (brandDropdown && brandDropdownToggle) {
        const setBrandDropdownState = (isOpen) => {
            brandDropdown.classList.toggle('open', isOpen);
            brandDropdownToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        };

        brandDropdownToggle.addEventListener('click', (event) => {
            event.preventDefault();
            const isDesktop = window.matchMedia('(min-width: 769px)').matches;
            const nextState = !brandDropdown.classList.contains('open');

            if (!isDesktop) {
                setBrandDropdownState(nextState);
            }
        });

        brandDropdown.addEventListener('mouseenter', () => {
            if (window.matchMedia('(min-width: 769px)').matches) {
                setBrandDropdownState(true);
            }
        });

        brandDropdown.addEventListener('mouseleave', () => {
            if (window.matchMedia('(min-width: 769px)').matches) {
                setBrandDropdownState(false);
            }
        });

        document.querySelectorAll('.nav-dropdown__link').forEach((link) => {
            link.addEventListener('click', () => {
                setBrandDropdownState(false);

                if (hamburgerBtn && navLinks) {
                    hamburgerBtn.classList.remove('active');
                    navLinks.classList.remove('open');
                    document.body.style.overflow = '';
                }
            });
        });

        document.addEventListener('click', (event) => {
            if (!brandDropdown.contains(event.target)) {
                setBrandDropdownState(false);
            }
        });
    }

    // ============================
    // PARALLAX - Hero background
    // ============================
    const heroBg = document.querySelector('.hero__parallax-bg');
    let ticking = false;

    function updateParallax() {
        if (!heroSection || !heroBg) {
            ticking = false;
            return;
        }

        const scrolled = window.scrollY;
        const heroHeight = heroSection.offsetHeight;

        if (scrolled < heroHeight) {
            const translateY = scrolled * 0.24;
            heroBg.style.transform = `translate3d(0, ${translateY}px, 0)`;
        }

        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }, { passive: true });

    // ============================
    // SCROLL REVEAL - IntersectionObserver
    // ============================
    const revealElements = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -60px 0px'
    });

    revealElements.forEach((element) => revealObserver.observe(element));

    // ============================
    // ACTIVE NAV LINK HIGHLIGHT
    // ============================
    const navLinkElements = document.querySelectorAll('.nav-link');

    function updateActiveNavLink() {
        const scrollY = window.scrollY + 140;
        let currentId = '';

        document.querySelectorAll('section[id]').forEach((section) => {
            const top = section.offsetTop;
            const height = section.offsetHeight;

            if (scrollY >= top && scrollY < top + height) {
                currentId = section.getAttribute('id');
            }
        });

        navLinkElements.forEach((link) => {
            link.classList.toggle('nav-link--active', link.getAttribute('href') === `#${currentId}`);
        });

        const isBrandSection = ['about', 'legacy', 'team', 'awards'].includes(currentId);
        if (brandDropdownToggle) {
            brandDropdownToggle.classList.toggle('nav-link--active', isBrandSection);
        }

        document.querySelectorAll('.nav-dropdown__link').forEach((link) => {
            link.classList.toggle('nav-link--active', link.getAttribute('href') === `#${currentId}`);
        });
    }

    window.addEventListener('scroll', updateActiveNavLink, { passive: true });
    updateActiveNavLink();

    // ============================
    // PORTFOLIO - Tab filter
    // ============================
    const filterBtns = document.querySelectorAll('.filter-btn');
    const portfolioCards = document.querySelectorAll('.portfolio__card');

    filterBtns.forEach((button) => {
        button.addEventListener('click', () => {
            filterBtns.forEach((btn) => btn.classList.remove('active'));
            button.classList.add('active');

            const filter = button.dataset.filter;

            portfolioCards.forEach((card) => {
                const isVisible = filter === 'all' || card.dataset.category === filter;
                card.classList.toggle('hidden', !isVisible);

                if (isVisible) {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(16px)';

                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            card.style.transition = 'opacity 0.45s ease, transform 0.45s ease';
                            card.style.opacity = '1';
                            card.style.transform = 'translateY(0)';
                        });
                    });
                }
            });
        });
    });

    // ============================
    // CONTACT FORM - Validation
    // ============================
    const form = document.getElementById('inquiryForm');
    const submitBtn = document.getElementById('submitBtn');
    const formSuccess = document.getElementById('formSuccess');
    const requiredFields = ['name', 'eventType', 'eventDate', 'location', 'budget'];

    if (form && submitBtn && formSuccess) {
        requiredFields.forEach((id) => {
            const field = document.getElementById(id);
            if (!field) return;

            const clearError = () => {
                const group = field.closest('.form-group');
                if (group) group.classList.remove('error');
            };

            field.addEventListener('input', clearError);
            field.addEventListener('change', clearError);
        });

        form.addEventListener('submit', (event) => {
            event.preventDefault();

            let isValid = true;

            requiredFields.forEach((id) => {
                const field = document.getElementById(id);
                if (!field) return;

                const group = field.closest('.form-group');
                const value = typeof field.value === 'string' ? field.value.trim() : field.value;

                if (!value) {
                    if (group) group.classList.add('error');
                    isValid = false;
                } else if (group) {
                    group.classList.remove('error');
                }
            });

            if (isValid) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span>Sending...</span>';

                setTimeout(() => {
                    form.style.display = 'none';
                    formSuccess.classList.add('show');
                }, 1200);
            }
        });
    }

    // ============================
    // SMOOTH SCROLL - Fixed nav offset
    // ============================
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', function (event) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            const target = document.querySelector(href);
            if (!target) return;

            event.preventDefault();

            if (brandDropdown && brandDropdownToggle) {
                brandDropdown.classList.remove('open');
                brandDropdownToggle.setAttribute('aria-expanded', 'false');
            }

            if (hamburgerBtn && navLinks) {
                hamburgerBtn.classList.remove('active');
                navLinks.classList.remove('open');
                document.body.style.overflow = '';
            }

            const offsetTop = target.getBoundingClientRect().top + window.scrollY - 84;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        });
    });

    // ============================
    // COUNTER ANIMATION - Stats
    // ============================
    const statNumbers = document.querySelectorAll('.stat__number');

    function animateCounter(element) {
        const text = element.textContent;
        const match = text.match(/(\d+)/);
        if (!match) return;

        const target = parseInt(match[0], 10);
        const suffix = text.replace(match[0], '');
        const duration = 1800;
        const startTime = performance.now();

        function updateCount(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(target * eased);

            element.textContent = current + suffix;

            if (progress < 1) {
                requestAnimationFrame(updateCount);
            }
        }

        requestAnimationFrame(updateCount);
    }

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                counterObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    statNumbers.forEach((element) => counterObserver.observe(element));

    // ============================
    // TESTIMONIALS - Slider
    // ============================
    const track = document.getElementById('testimonialsTrack');
    const prevBtn = document.getElementById('prevTestimonial');
    const nextBtn = document.getElementById('nextTestimonial');
    const dots = document.querySelectorAll('#testimonialDots .dot');
    const totalSlides = document.querySelectorAll('.testimonial__card').length;
    let currentSlide = 0;

    function goToSlide(index) {
        if (!track || !dots.length || !totalSlides) return;

        if (index < 0) index = totalSlides - 1;
        if (index >= totalSlides) index = 0;

        currentSlide = index;
        track.style.transform = `translateX(-${currentSlide * 100}%)`;
        track.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
        dots.forEach((dot, dotIndex) => {
            dot.classList.toggle('active', dotIndex === currentSlide);
        });
    }

    if (prevBtn) prevBtn.addEventListener('click', () => goToSlide(currentSlide - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goToSlide(currentSlide + 1));

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => goToSlide(index));
    });

    let autoSlide;
    if (track && totalSlides > 1) {
        autoSlide = setInterval(() => goToSlide(currentSlide + 1), 5000);
        const sliderEl = document.querySelector('.testimonials__slider');

        if (sliderEl) {
            sliderEl.addEventListener('mouseenter', () => clearInterval(autoSlide));
            sliderEl.addEventListener('mouseleave', () => {
                autoSlide = setInterval(() => goToSlide(currentSlide + 1), 5000);
            });
        }
    }

    // ============================
    // REEL VIDEO - Play/Pause toggle
    // ============================
    const reelVideo = document.querySelector('.reel__video');
    const reelToggle = document.querySelector('.reel__video-toggle');

    if (reelVideo && reelToggle) {
        const syncReelState = () => {
            const isPaused = reelVideo.paused;
            reelToggle.classList.toggle('is-paused', isPaused);
            reelToggle.setAttribute('aria-label', isPaused ? 'Play video' : 'Pause video');
        };

        reelVideo.muted = true;
        reelVideo.loop = true;

        const playPromise = reelVideo.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
                syncReelState();
            });
        }

        syncReelState();

        reelToggle.addEventListener('click', () => {
            if (reelVideo.paused) {
                reelVideo.play();
            } else {
                reelVideo.pause();
            }
            syncReelState();
        });

        reelVideo.addEventListener('play', syncReelState);
        reelVideo.addEventListener('pause', syncReelState);
    }

    // ============================
    // BOOKING SLOTS - Frontend only
    // ============================
    const bookingSlots = document.querySelectorAll('.booking__slot');
    const bookingSummary = document.getElementById('bookingSummary');
    const meetingDate = document.getElementById('meetingDate');

    function updateBookingSummary() {
        if (!bookingSummary) return;

        const activeSlot = document.querySelector('.booking__slot.active');
        const slotText = activeSlot ? activeSlot.textContent.trim() : 'No slot selected';
        const dateText = meetingDate && meetingDate.value ? meetingDate.value : '';

        if (typeof I18n !== 'undefined') {
            const template = dateText
                ? I18n.t('booking.summary_template')
                : I18n.t('booking.summary_no_date');
            bookingSummary.textContent = template
                .replace('{slot}', slotText)
                .replace('{date}', dateText || 'your chosen date');
        } else {
            bookingSummary.textContent = `Tentative slot selected: ${slotText} on ${dateText || 'your chosen date'}`;
        }
    }

    bookingSlots.forEach((slot) => {
        slot.addEventListener('click', () => {
            bookingSlots.forEach((button) => button.classList.remove('active'));
            slot.classList.add('active');
            updateBookingSummary();
        });
    });

    if (meetingDate) {
        meetingDate.addEventListener('change', updateBookingSummary);
    }

    updateBookingSummary();

    // Update booking summary when language changes
    window.addEventListener('languageChanged', updateBookingSummary);

    // ============================
    // FAQ - Accordion
    // ============================
    const faqItems = document.querySelectorAll('.faq__item');

    faqItems.forEach((item) => {
        const question = item.querySelector('.faq__question');
        if (!question) return;

        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');

            faqItems.forEach((other) => {
                other.classList.remove('active');
                const otherQuestion = other.querySelector('.faq__question');
                if (otherQuestion) otherQuestion.setAttribute('aria-expanded', 'false');
            });

            if (!isActive) {
                item.classList.add('active');
                question.setAttribute('aria-expanded', 'true');
            }
        });
    });
});
