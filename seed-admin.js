// seed-admin.js
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';

// Your Firebase config - COPY THIS FROM YOUR firebase.ts file
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function seedAdminUser() {
  const email = 'admin@luxe.com';
  const password = 'Admin123!'; // Change this to a secure password
  
  try {
    let userCred;
    
    try {
      // Try to sign in first (user might already exist)
      userCred = await signInWithEmailAndPassword(auth, email, password);
      console.log('User already exists, signing in...');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create the user if they don't exist
        userCred = await createUserWithEmailAndPassword(auth, email, password);
        console.log('User created successfully!');
      } else {
        throw error;
      }
    }
    
    // Create/Update Firestore document
    const userData = {
      id: userCred.user.uid,
      email: email,
      fullName: 'Admin User',
      role: 'admin',
      createdAt: Timestamp.now(),
      lastLogin: Timestamp.now(),
      avatar: '',
      phoneNumber: '',
    };
    
    await setDoc(doc(db, 'users', userCred.user.uid), userData);
    console.log('Admin user document created/updated in Firestore!');
    console.log('User ID:', userCred.user.uid);
    console.log('Email:', email);
    console.log('Password:', password);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

seedAdminUser();