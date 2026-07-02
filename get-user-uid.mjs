// update-firestore.mjs
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDqDnTWFf0xluB_U41GXxCYfKsGK5QX9Ag",
  authDomain: "luxe-b95d0.firebaseapp.com",
  projectId: "luxe-b95d0",
  storageBucket: "luxe-b95d0.firebasestorage.app",
  messagingSenderId: "217781331790",
  appId: "1:217781331790:web:881aee2b3ace08f297201f",
  measurementId: "G-BJGZTH01TH",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function updateFirestore() {
  const email = 'admin@luxe.com';
  const password = 'password123';
  
  try {
    console.log('🔍 Signing in...');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log('✅ Signed in successfully!');
    console.log('🆔 User UID:', user.uid);
    
    // Create the Firestore document
    const userData = {
      id: user.uid,
      email: email,
      fullName: 'Admin User',
      role: 'admin',
      createdAt: Date.now(),
      lastLogin: Date.now(),
      avatar: '',
      phoneNumber: '',
    };
    
    console.log('📝 Creating Firestore document...');
    await setDoc(doc(db, 'users', user.uid), userData);
    
    console.log('✅ Firestore document created successfully!');
    console.log('\n🎉 All done! You can now login to the app:');
    console.log('   🌐 http://localhost:8080/');
    console.log('   📧 Email:', email);
    console.log('   🔐 Password:', password);
    console.log('   👤 Role: admin');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'auth/wrong-password') {
      console.log('ℹ️ Wrong password. Please check the password.');
    } else if (error.code === 'auth/user-not-found') {
      console.log('ℹ️ User not found. Creating new user...');
      // Try to create the user
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('✅ User created!');
        // Then create Firestore document...
      } catch (createError) {
        console.error('❌ Failed to create user:', createError.message);
      }
    }
  }
}

updateFirestore();