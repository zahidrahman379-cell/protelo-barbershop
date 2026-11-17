/* =========================================
   PROTELO CLASSIC BARBERSHOP - SCRIPT
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize EmailJS with your Public Key
    if (typeof emailjs !== 'undefined') {
        emailjs.init({
            publicKey: 'ZcWQ5aFp-sikbld__'
        });
    }

    // --- SUPABASE CONFIGURATION (Safe Initialization) ---
    const SUPABASE_URL = 'https://dhwtboxpcefwgmqqoamy.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_DDJY0xu22T_LAFRAHMNLTQ_rY7y1K_n';

    // Only initialize if window.supabase exists on this specific page
    let supabaseClient = null;
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    const mobileToggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');
    const bookingForm = document.getElementById('bookingForm');
    const contactForm = document.getElementById('contactForm');
    const bookingModal = document.getElementById('bookingModal');
    const closeModal = document.getElementById('closeModal');
    const confirmModalBtn = document.getElementById('confirmModalBtn');

    // Booking Elements
    const selectBarber = document.getElementById('selectBarber');
    const bookDate = document.getElementById('bookDate');
    const bookTime = document.getElementById('bookTime');
    const submitBookingBtn = document.getElementById('submitBookingBtn');

    // On-Page Cancellation Lookup Elements
    const cancelEmailInput = document.getElementById('cancelEmail');
    const findBookingBtn = document.getElementById('findBookingBtn');
    const cancelResults = document.getElementById('cancelResults');

    // Admin Elements
    const adminBookingList = document.getElementById('adminBookingList');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const statTotalBookings = document.getElementById('statTotalBookings');
    const statTodayBookings = document.getElementById('statTodayBookings');
    const panelCount = document.getElementById('panelCount');

    // All standard daily time slots
    const ALL_TIME_SLOTS = [
        { value: "09:00 AM", label: "09:00 AM" },
        { value: "10:30 AM", label: "10:30 AM" },
        { value: "12:00 PM", label: "12:00 PM" },
        { value: "02:00 PM", label: "02:00 PM" },
        { value: "04:00 PM", label: "04:00 PM" },
        { value: "06:00 PM", label: "06:00 PM" }
    ];

    // Set copyright year
    const yearEl = document.getElementById('currentYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Mobile Navigation Toggle
    if (mobileToggle && navLinks) {
        mobileToggle.addEventListener('click', () => {
            navLinks.classList.toggle('open');
        });
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => navLinks.classList.remove('open'));
        });
    }

    // --- SUPABASE HELPER FUNCTIONS ---

    // Fetch all bookings from Supabase safely
    const loadBookingsAndRefreshUI = async (callback) => {
        if (!supabaseClient) return; // Exit safely if Supabase isn't loaded on this page

        const { data, error } = await supabaseClient
            .from('protelo_bookings')
            .select('*');

        if (error) {
            console.error("Error fetching bookings from Supabase: ", error);
            return;
        }

        const formattedBookings = data.map(item => ({
            id: item.id,
            barber: item.barber,
            date: item.date,
            time: item.time,
            clientName: item.client_name,
            clientEmail: item.client_email,
            service: item.service
        }));

        if (typeof callback === 'function') callback(formattedBookings);
    };

    // Update available slots dynamically based on active database bookings
    const updateAvailableSlots = () => {
        if (!bookDate || !bookTime || !selectBarber || !supabaseClient) return;

        const chosenBarber = selectBarber.value;
        const chosenDate = bookDate.value;

        loadBookingsAndRefreshUI((bookings) => {
            const takenTimes = bookings
                .filter(b => b.barber === chosenBarber && b.date === chosenDate)
                .map(b => b.time);

            const availableSlots = ALL_TIME_SLOTS.filter(slot => !takenTimes.includes(slot.value));

            bookTime.innerHTML = '';

            if (availableSlots.length === 0) {
                const opt = document.createElement('option');
                opt.value = '';
                opt.textContent = 'No slots available on this date';
                bookTime.appendChild(opt);
                bookTime.disabled = true;
                if (submitBookingBtn) submitBookingBtn.disabled = true;
            } else {
                bookTime.disabled = false;
                if (submitBookingBtn) submitBookingBtn.disabled = false;
                availableSlots.forEach(slot => {
                    const opt = document.createElement('option');
                    opt.value = slot.value;
                    opt.textContent = slot.label;
                    bookTime.appendChild(opt);
                });
            }
        });
    };

    // --- ON-PAGE EMAIL LOOKUP CANCELLATION LOGIC ---
    if (findBookingBtn && cancelEmailInput && cancelResults) {
        const executeSearch = (e) => {
            if (e) e.preventDefault();

            const emailQuery = cancelEmailInput.value.trim().toLowerCase();

            if (!emailQuery) {
                cancelResults.innerHTML = `
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(197,155,39,0.3); padding: 1.25rem; border-radius: 4px; text-align: center;">
                        <p style="color: #aaa; font-size: 0.9rem; margin: 0;">Please enter your booking email address above.</p>
                    </div>
                `;
                return;
            }

            loadBookingsAndRefreshUI((bookings) => {
                const matchedBookings = bookings.filter(b => b.clientEmail && b.clientEmail.toLowerCase() === emailQuery);

                if (matchedBookings.length === 0) {
                    cancelResults.innerHTML = `
                        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(197,155,39,0.3); padding: 1.25rem; border-radius: 4px; text-align: center;">
                            <p style="color: #aaa; font-size: 0.9rem; margin: 0;">No active bookings found for <strong>${cancelEmailInput.value}</strong>.</p>
                        </div>
                    `;
                    return;
                }

                cancelResults.innerHTML = `
                    <div style="text-align: left;">
                        <h4 style="font-family: 'Cinzel', serif; color: #C59B27; margin-bottom: 0.75rem; text-align: center; font-size: 1rem;">Active Reservations Found</h4>
                        ${matchedBookings.map((b) => `
                            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(197,155,39,0.3); padding: 1rem; border-radius: 4px; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                                <div>
                                    <p style="margin: 0.1rem 0; color: #C59B27; font-family: 'Cinzel', serif; font-size: 0.95rem;">${b.date} at ${b.time}</p>
                                    <p style="margin: 0.1rem 0; color: #F4EFE6; font-size: 0.85rem;"><strong>Barber:</strong> ${b.barber} &bull; <strong>Service:</strong> ${b.service || 'Haircut'}</p>
                                </div>
                                <button type="button" class="btn-cancel-target" data-id="${b.id}" style="background: #8b2626; color: #fff; border: none; padding: 0.5rem 1rem; cursor: pointer; font-family: 'Montserrat', sans-serif; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px;">
                                    Cancel
                                </button>
                            </div>
                        `).join('')}
                    </div>
                `;

                cancelResults.querySelectorAll('.btn-cancel-target').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const bookingId = btn.getAttribute('data-id');
                        if (!supabaseClient) return;

                        const { error } = await supabaseClient
                            .from('protelo_bookings')
                            .delete()
                            .eq('id', bookingId);

                        if (!error) {
                            updateAvailableSlots();
                            renderAdminBookings();
                            cancelResults.innerHTML = `
                                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(197,155,39,0.3); padding: 1.25rem; border-radius: 4px; text-align: center;">
                                    <p style="color: #F4EFE6; font-size: 0.9rem; margin: 0;">Appointment successfully canceled and chair released.</p>
                                </div>
                            `;
                        } else {
                            console.error("Error deleting booking: ", error);
                        }
                    });
                });
            });
        };

        findBookingBtn.addEventListener('click', executeSearch);
        cancelEmailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') executeSearch(e);
        });
    }

    // Render Admin Dashboard Bookings List from Supabase
    const renderAdminBookings = () => {
        if (!adminBookingList || !supabaseClient) return;

        loadBookingsAndRefreshUI((bookings) => {
            if (statTotalBookings) statTotalBookings.textContent = bookings.length;
            if (panelCount) panelCount.textContent = `${bookings.length} total`;

            const todayStr = new Date().toISOString().split('T')[0];
            if (statTodayBookings) {
                statTodayBookings.textContent = bookings.filter(b => b.date === todayStr).length;
            }

            if (bookings.length === 0) {
                adminBookingList.innerHTML = `
                    <div style="text-align: center; padding: 4rem 0; color: #888;">
                        <p style="font-size: 1.1rem; font-family: 'Cinzel', serif; color: #aaa;">No active reservations found.</p>
                        <p style="font-size: 0.85rem; margin-top: 0.5rem;">When clients book a chair, they will appear here instantly.</p>
                    </div>
                `;
                return;
            }

            adminBookingList.innerHTML = bookings.map((item) => `
                <div class="booking-card-item" style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); border: 1px solid rgba(197,155,39,0.25); padding: 1.25rem 1.5rem; margin-bottom: 1rem; border-radius: 4px;">
                    <div>
                        <div style="font-family: 'Cinzel', serif; font-size: 1.1rem; color: #C59B27; margin-bottom: 0.3rem;">
                            ${item.date} at ${item.time}
                        </div>
                        <div style="font-size: 0.9rem; color: #F4EFE6;">
                            <strong>Client:</strong> ${item.clientName || 'N/A'} (${item.clientEmail || 'No email'})
                        </div>
                        <div style="font-size: 0.85rem; color: #aaa; margin-top: 0.2rem;">
                            <strong>Barber:</strong> ${item.barber} &bull; <strong>Service:</strong> ${item.service || 'Haircut'}
                        </div>
                    </div>
                    <button type="button" class="admin-cancel-btn" data-id="${item.id}" style="background: #8b2626; color: #fff; border: none; padding: 0.6rem 1.2rem; cursor: pointer; font-family: 'Montserrat', sans-serif; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;">
                        Cancel Slot
                    </button>
                </div>
            `).join('');

            adminBookingList.querySelectorAll('.admin-cancel-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const bookingId = btn.getAttribute('data-id');
                    if (!supabaseClient) return;

                    const { error } = await supabaseClient
                        .from('protelo_bookings')
                        .delete()
                        .eq('id', bookingId);

                    if (!error) {
                        updateAvailableSlots();
                        renderAdminBookings();
                    }
                });
            });
        });
    };

    // Handle Clear All Button on Admin
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to clear all active bookings?') && supabaseClient) {
                const { error } = await supabaseClient
                    .from('protelo_bookings')
                    .delete()
                    .neq('id', 0);

                if (!error) {
                    renderAdminBookings();
                    updateAvailableSlots();
                }
            }
        });
    }

    // Initialize Date Picker & Slot Filtering
    if (bookDate) {
        const today = new Date().toISOString().split('T')[0];
        bookDate.min = today;
        bookDate.value = today;

        bookDate.addEventListener('click', () => {
            if (typeof bookDate.showPicker === 'function') {
                bookDate.showPicker();
            }
        });

        bookDate.addEventListener('change', updateAvailableSlots);
        if (selectBarber) selectBarber.addEventListener('change', updateAvailableSlots);

        updateAvailableSlots();
    }

    // Render Admin list on load
    renderAdminBookings();

    // Handle Booking Form Submission & Save to Supabase + EmailJS
    if (bookingForm) {
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!supabaseClient) {
                alert('Database connection not available.');
                return;
            }

            const chosenBarber = selectBarber.value;
            const chosenDate = bookDate.value;
            const chosenTime = bookTime.value;
            const clientName = document.getElementById('clientName').value;
            const clientEmail = document.getElementById('clientEmail').value;
            const selectedService = document.getElementById('selectService').value;

            if (!chosenTime) return;

            const serviceID = 'service_t5n9il9';
            const ownerTemplateID = 'template_tk49v6w';
            const customerTemplateID = 'template_ue7l3ht';

            const templateParams = {
                client_name: clientName,
                client_email: clientEmail,
                barber: chosenBarber,
                service: selectedService,
                date: chosenDate,
                time: chosenTime
            };

            const finalizeBooking = async () => {
                const { error } = await supabaseClient
                    .from('protelo_bookings')
                    .insert([
                        {
                            barber: chosenBarber,
                            date: chosenDate,
                            time: chosenTime,
                            client_name: clientName,
                            client_email: clientEmail,
                            service: selectedService
                        }
                    ]);

                if (!error) {
                    updateAvailableSlots();
                    renderAdminBookings();
                    if (submitBookingBtn) {
                        submitBookingBtn.disabled = false;
                        submitBookingBtn.textContent = 'Confirm Reservation';
                    }
                    if (bookingModal) bookingModal.classList.add('active');
                } else {
                    console.error("Error saving booking to Supabase: ", error);
                    alert('Could not save booking to database.');
                    if (submitBookingBtn) {
                        submitBookingBtn.disabled = false;
                        submitBookingBtn.textContent = 'Confirm Reservation';
                    }
                }
            };

            if (typeof emailjs !== 'undefined') {
                if (submitBookingBtn) {
                    submitBookingBtn.disabled = true;
                    submitBookingBtn.textContent = 'Sending Confirmation...';
                }

                Promise.all([
                    emailjs.send(serviceID, ownerTemplateID, templateParams),
                    emailjs.send(serviceID, customerTemplateID, templateParams)
                ])
                .then(() => {
                    finalizeBooking();
                })
                .catch((error) => {
                    console.error('EmailJS Error:', error);
                    alert('Could not send email notification. Check the browser console for details.');
                    if (submitBookingBtn) {
                        submitBookingBtn.disabled = false;
                        submitBookingBtn.textContent = 'Confirm Reservation';
                    }
                });
            } else {
                alert('EmailJS library not loaded.');
            }
        });
    }

    // --- HANDLE CONTACT FORM SUBMISSION (SUPABASE + EMAILJS) ---
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!supabaseClient) {
                alert('Database connection not available.');
                return;
            }

            const nameInput = document.getElementById('contactName') || contactForm.querySelector('[name="name"]');
            const emailInput = document.getElementById('contactEmail') || contactForm.querySelector('[name="email"]');
            const phoneInput = document.getElementById('contactPhone') || contactForm.querySelector('[name="phone"]');
            const messageInput = document.getElementById('contactMessage') || contactForm.querySelector('[name="message"]');

            const name = nameInput ? nameInput.value : '';
            const email = emailInput ? emailInput.value : '';
            const phone = phoneInput ? phoneInput.value : '';
            const message = messageInput ? messageInput.value : '';

            const submitContactBtn = contactForm.querySelector('button[type="submit"]');
            if (submitContactBtn) {
                submitContactBtn.disabled = true;
                submitContactBtn.textContent = 'Sending Message...';
            }

            const serviceID = 'service_t5n9il9';
            const contactTemplateID = 'template_tk49v6w'; // Reusing or custom contact template ID

            const templateParams = {
                from_name: name,
                from_email: email,
                phone: phone,
                message: message
            };

            try {
                // 1. Save to Supabase protelo_contacts table
                const { error: dbError } = await supabaseClient
                    .from('protelo_contacts')
                    .insert([{ name, email, phone, message }]);

                if (dbError) throw dbError;

                // 2. Send via EmailJS
                if (typeof emailjs !== 'undefined') {
                    await emailjs.send(serviceID, contactTemplateID, templateParams);
                }

                alert('Your message has been sent successfully and saved!');
                contactForm.reset();
            } catch (err) {
                console.error('Error submitting contact form:', err);
                alert('Failed to send message. Please check your network or database configuration.');
            } finally {
                if (submitContactBtn) {
                    submitContactBtn.disabled = false;
                    submitContactBtn.textContent = 'Send Message';
                }
            }
        });
    }

    // Modal Closing & Redirection to index.html
    const hideModal = () => {
        if (bookingModal) bookingModal.classList.remove('active');
        window.location.href = 'index.html';
    };

    if (closeModal) closeModal.addEventListener('click', hideModal);
    if (confirmModalBtn) confirmModalBtn.addEventListener('click', hideModal);
    if (bookingModal) {
        bookingModal.addEventListener('click', (e) => {
            if (e.target === bookingModal) hideModal();
        });
    }
});