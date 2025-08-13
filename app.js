// Function to show a custom modal with a message
const showModal = (message) => {
    const modal = document.getElementById('modal');
    const modalMessage = document.getElementById('modal-message');
    const modalClose = document.getElementById('modal-close');

    modalMessage.textContent = message;
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    modalClose.onclick = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    };
};

// Global Firebase configuration and variables
let db, auth;
let userId;

// This function initializes Firebase and sets up the auth state listener
const setupFirebase = () => {
    // Canvas global variables, if not available use defaults
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const firebaseConfig = {
        apiKey: "AIzaSyBLCHgSmltZfyxpbQyhmPfoeQdSCMql-l0",
        authDomain: "quizzo-2.firebaseapp.com",
        projectId: "quizzo-2",
        storageBucket: "quizzo-2.firebasestorage.app",
        messagingSenderId: "163469458991",
        appId: "1:163469458991:web:8c0eb4536b5b501865d0da"
    };
    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

    const { initializeApp, getAuth, onAuthStateChanged, signInWithCustomToken, signInAnonymously, getFirestore } = window.firebaseDependencies;

    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Set up the auth state listener
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // User is signed in
                userId = user.uid;
            } else {
                // User is signed out. Sign in anonymously as a fallback.
                try {
                    await signInAnonymously(auth);
                } catch (error) {
                    console.error("Error signing in anonymously:", error);
                }
            }
            // Run the main page logic after authentication is ready
            handlePageLoad();
        });

        // Use the initial auth token for Canvas environment
        if (initialAuthToken) {
            signInWithCustomToken(auth, initialAuthToken).catch((error) => {
                console.error("Error signing in with custom token:", error);
            });
        }

    } catch (error) {
        showModal(`Error initializing Firebase: ${error.message}. Please check your Firebase configuration.`);
        console.error(error);
    }
};

// Function to handle the authentication state and update the UI
const updateAuthControls = (user) => {
    const authControls = document.getElementById('auth-controls');
    if (!authControls) return;

    authControls.innerHTML = ''; // Clear existing controls

    if (user && !user.isAnonymous) {
        // Logged-in user
        const signOutButton = document.createElement('button');
        signOutButton.textContent = 'Sign Out';
        signOutButton.className = 'bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors';
        signOutButton.onclick = async () => {
            await auth.signOut();
            window.location.href = 'index.html';
        };
        authControls.appendChild(signOutButton);
    } else {
        // Guest user or signed out
        const loginButton = document.createElement('a');
        loginButton.textContent = 'Log In';
        loginButton.href = 'login.html';
        loginButton.className = 'bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors';
        
        const signupButton = document.createElement('a');
        signupButton.textContent = 'Sign Up';
        signupButton.href = 'signup.html';
        signupButton.className = 'bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors';
        
        authControls.appendChild(loginButton);
        authControls.appendChild(signupButton);
    }
};

// --- Page-specific logic below ---

// Logic for index.html
const handleIndexPage = () => {
    const { getFirestore, collection, query, onSnapshot, orderBy } = window.firebaseDependencies;
    const quizzesContainer = document.getElementById('quizzes-container');
    const loadingMessage = document.getElementById('loading-quizzes');

    // Update the auth controls
    if (auth.currentUser) {
        updateAuthControls(auth.currentUser);
    } else {
        // Fallback for anonymous user before listener fires
        updateAuthControls(null);
    }

    if (!quizzesContainer || !db) return;

    const quizzesQuery = query(collection(db, `artifacts/${__app_id}/public/data/quizzes`), orderBy('createdAt', 'desc'));
    
    // Listen for real-time updates to the quizzes collection
    onSnapshot(quizzesQuery, (querySnapshot) => {
        quizzesContainer.innerHTML = '';
        if (querySnapshot.empty) {
            quizzesContainer.innerHTML = '<p class="text-center text-gray-500 col-span-full">No quizzes available yet. Check back later!</p>';
        } else {
            querySnapshot.forEach((doc) => {
                const quizData = doc.data();
                const quizId = doc.id;
                const quizCard = `
                    <a href="quiz.html?id=${quizId}" class="quiz-card block bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 ease-in-out">
                        <h3 class="text-xl font-semibold text-indigo-600 mb-2">${quizData.title}</h3>
                        <p class="text-gray-600 mb-4">${quizData.description}</p>
                        <span class="text-sm font-medium text-gray-400">Created by: ${quizData.teacherId}</span>
                    </a>
                `;
                quizzesContainer.innerHTML += quizCard;
            });
        }
    }, (error) => {
        console.error("Error fetching quizzes:", error);
        showModal("Could not load quizzes. Please try again later.");
    });
};

// Logic for quiz.html
const handleQuizPage = () => {
    const { getFirestore, doc, onSnapshot, collection, addDoc, serverTimestamp } = window.firebaseDependencies;
    const quizContainer = document.getElementById('quiz-container');
    const loadingMessage = document.getElementById('loading-quiz');

    // Get the quiz ID from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const quizId = urlParams.get('id');

    if (!quizId) {
        quizContainer.innerHTML = '<p class="text-center text-red-500">Error: Quiz ID not found.</p>';
        return;
    }

    if (!quizContainer || !db) return;

    // Update the auth controls
    if (auth.currentUser) {
        updateAuthControls(auth.currentUser);
    } else {
        // Fallback for anonymous user before listener fires
        updateAuthControls(null);
    }

    // Fetch the quiz data
    const quizDocRef = doc(db, `artifacts/${__app_id}/public/data/quizzes`, quizId);

    onSnapshot(quizDocRef, (quizDoc) => {
        if (!quizDoc.exists()) {
            quizContainer.innerHTML = '<p class="text-center text-red-500">Error: Quiz not found.</p>';
            return;
        }

        const quizData = quizDoc.data();
        quizContainer.innerHTML = `
            <h2 class="text-2xl font-bold text-gray-800 mb-4">${quizData.title}</h2>
            <p class="text-gray-600 mb-6">${quizData.description}</p>
            <form id="quiz-form">
                ${quizData.questions.map((q, qIndex) => `
                    <div class="mb-6">
                        <p class="font-semibold text-gray-700 mb-2">${q.text}</p>
                        ${q.options.map((option, oIndex) => `
                            <div class="flex items-center mb-2">
                                <input type="radio" id="q${qIndex}o${oIndex}" name="question-${qIndex}" value="${option.text}" class="mr-2">
                                <label for="q${qIndex}o${oIndex}" class="text-gray-600">${option.text}</label>
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
                <button type="submit" class="w-full bg-indigo-600 text-white font-bold py-2 rounded-md hover:bg-indigo-700 transition-colors">Submit Quiz</button>
            </form>
        `;

        const quizForm = document.getElementById('quiz-form');
        quizForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (auth.currentUser.isAnonymous) {
                showModal("Please log in to submit a quiz!");
                return;
            }

            const formData = new FormData(quizForm);
            const userAnswers = {};
            for (let [key, value] of formData.entries()) {
                userAnswers[key] = value;
            }

            // Calculate the score
            let score = 0;
            quizData.questions.forEach((q, index) => {
                const userAnswer = userAnswers[`question-${index}`];
                if (userAnswer === q.correctAnswer) {
                    score++;
                }
            });

            // Save the attempt to Firestore
            try {
                const attemptDocRef = await addDoc(collection(db, `artifacts/${__app_id}/public/data/quizAttempts`), {
                    quizId: quizId,
                    userId: auth.currentUser.uid,
                    userAnswers: userAnswers,
                    score: score,
                    totalQuestions: quizData.questions.length,
                    submittedAt: serverTimestamp(),
                });
                showModal(`Quiz submitted successfully! Your score is ${score}/${quizData.questions.length}.`);
            } catch (error) {
                console.error("Error submitting quiz:", error);
                showModal("Error submitting quiz. Please try again.");
            }
        });
    }, (error) => {
        console.error("Error fetching quiz:", error);
        showModal("Could not load quiz. Please try again later.");
    });
};

// Logic for login.html
const handleLoginPage = () => {
    const { getAuth, signInWithEmailAndPassword } = window.firebaseDependencies;
    const loginForm = document.getElementById('login-form');

    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginForm.email.value;
        const password = loginForm.password.value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = 'index.html'; // Redirect to the main page on success
        } catch (error) {
            showModal(`Login failed: ${error.message}`);
            console.error("Login error:", error);
        }
    });
};

// Logic for signup.html
const handleSignupPage = () => {
    const { getAuth, createUserWithEmailAndPassword, getFirestore, doc, setDoc } = window.firebaseDependencies;
    const signupForm = document.getElementById('signup-form');

    if (!signupForm) return;

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = signupForm.email.value;
        const password = signupForm.password.value;
        const designation = signupForm.designation.value;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Save user profile to Firestore
            const userProfileRef = doc(getFirestore(), `artifacts/${__app_id}/users/${user.uid}/profile/data`);
            await setDoc(userProfileRef, {
                email: email,
                designation: designation,
                createdAt: new Date(),
            });

            window.location.href = 'index.html'; // Redirect to main page
        } catch (error) {
            showModal(`Sign up failed: ${error.message}`);
            console.error("Sign up error:", error);
        }
    });
};


// Main function to route to the correct page logic
const handlePageLoad = () => {
    const path = window.location.pathname;

    // Update auth controls on every page load
    updateAuthControls(auth.currentUser);

    // Route based on the current page's file name
    switch (true) {
        case path.endsWith('login.html'):
            handleLoginPage();
            break;
        case path.endsWith('signup.html'):
            handleSignupPage();
            break;
        case path.endsWith('quiz.html'):
            handleQuizPage();
            break;
        case path.endsWith('index.html'):
        case path === '/':
            handleIndexPage();
            break;
        default:
            // Default to index page if path is unknown
            window.location.href = 'index.html';
            break;
    }
};

// Start the app by setting up Firebase
document.addEventListener('DOMContentLoaded', setupFirebase);
