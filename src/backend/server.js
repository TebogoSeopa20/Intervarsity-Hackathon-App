// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const plantsApi = require('./api/plants-api');
const culturePracticeApi = require('./api/cultural-practices-api');
const appointmentsApi = require('./api/appointments-api');
const engagementsApi = require('./api/engagements-api');
const usersApi = require('./api/users-api');
const seekerReportsApi = require('./api/seeker-reports-api');
const contributorReportsApi = require('./api/contributor-reports-api');

// Create the Express application
const app = express();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Google OAuth Configuration
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUrl = process.env.NODE_ENV === 'production' 
  ? process.env.PRODUCTION_REDIRECT_URL
  : 'http://localhost:3000/auth/google/callback';

// Configure middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'frontend', 'html')));

app.use('/api', plantsApi);
app.use('/api', culturePracticeApi);
app.use('/api', appointmentsApi);
app.use('/api', engagementsApi);
app.use('/api', usersApi);
app.use('/api', seekerReportsApi);
app.use('/api', contributorReportsApi);
// Serve CSS files from css directory
app.use('/css', express.static(path.join(__dirname, 'frontend', 'css')));

// Serve JS files from js directory
app.use('/js', express.static(path.join(__dirname, 'frontend', 'js')));

// Serve images from images directory
app.use('/images', express.static(path.join(__dirname, 'frontend', 'images')));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', 
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true
  }
}));

// Custom middleware for logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Helper function to get dashboard URL by role
function getDashboardUrlByRole(role) {
  const normalizedRole = role ? role.toLowerCase() : 'seeker';
  
  switch (normalizedRole) {
    case 'moderator':
      return '/moderator-dashboard.html';
    case 'contributor':
      return '/contributor-dashboard.html';
    case 'seeker':
    default:
      return '/seeker-dashboard.html';
  }
}

// Google Auth Endpoints
app.get('/auth/google', (req, res) => {
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUrl);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', 'email profile');
  authUrl.searchParams.append('prompt', 'select_account');
  
  if (req.query.redirect) {
    req.session.redirectAfterLogin = req.query.redirect;
  }
  
  res.redirect(authUrl.toString());
});

app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.redirect('/login?error=google_auth_failed');
  }
  
  try {
    // Exchange authorization code for tokens
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUrl,
      grant_type: 'authorization_code'
    });
    
    // Get user info with the access token
    const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` }
    });
    
    const { email, name, picture, sub: googleId } = userInfoResponse.data;
    
    // Check if user exists in Supabase
    const { data: existingUser, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    if (userError) {
      console.error(`Error checking for existing user: ${userError.message}`);
      return res.redirect('/login?error=server_error');
    }
    
    // If user doesn't exist, store Google data and redirect to cultural signup
    if (!existingUser) {
      const googleProfile = {
        email,
        full_name: name,
        picture,
        googleId
      };
      
      const token = jwt.sign(googleProfile, process.env.SESSION_SECRET, { expiresIn: '15m' });
      req.session.googleProfile = googleProfile;
      
      return res.redirect(`/signup-cultural?token=${token}`);
    }
    
    // Existing user: get auth user and create session
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(
      existingUser.id
    );
    
    if (authError || !authUser.user) {
      return res.redirect('/login?error=user_not_found');
    }
    
    // Create a session manually (simplified approach)
    req.session.user = {
      id: authUser.user.id,
      email: authUser.user.email,
      role: existingUser.role,
      full_name: existingUser.full_name
    };
    
    // Prepare user data for client-side storage
    const userForClient = {
      id: authUser.user.id,
      email: authUser.user.email,
      role: existingUser.role,
      full_name: existingUser.full_name,
      cultural_affiliation: existingUser.cultural_affiliation
    };
    
    const dashboardUrl = getDashboardUrlByRole(existingUser.role);
    const redirectTo = req.session.redirectAfterLogin || dashboardUrl;
    delete req.session.redirectAfterLogin;
    
    // Encode user data for URL parameter
    const encodedUserData = encodeURIComponent(JSON.stringify(userForClient));
    
    return res.redirect(`${redirectTo}?success=true&userData=${encodedUserData}`);
  } catch (error) {
    console.error(`Google auth error: ${error.message}`);
    return res.redirect('/login?error=google_auth_error');
  }
});


// server.js - Updated to handle role properly

// Regular Email Signup Endpoint - UPDATED TO HANDLE ROLE
app.post('/api/signup', async (req, res) => {
  try {
    const { 
      role, // ADDED: Capture role from request body
      full_name, 
      email, 
      password, 
      confirmPassword, 
      phone,
      cultural_affiliation,
      terms_agreed,
      ethics_agreed,
      safety_agreed,
      newsletter_agreed
    } = req.body;
    
    // Basic validation
    const errors = {};
    
    if (!role) errors.role = 'Role is required'; // ADDED: Validate role
    if (!full_name) errors.full_name = 'Full name is required';
    if (!email) errors.email = 'Email is required';
    if (!password) errors.password = 'Password is required';
    if (password && password.length < 8) errors.password = 'Password must be at least 8 characters';
    if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
    if (!phone) errors.phone = 'Phone number is required';
    if (!cultural_affiliation || cultural_affiliation.length === 0) {
      errors.cultural_affiliation = 'Cultural affiliation is required';
    }
    if (!terms_agreed) errors.terms_agreed = 'You must agree to the Terms of Service and Privacy Policy';
    if (!ethics_agreed) errors.ethics_agreed = 'You must agree to respect cultural protocols';
    
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    
    // Check if email already exists
    const { data: existingUser, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    
    if (userError) {
      console.error(`Error checking for existing user: ${userError.message}`);
      return res.status(500).json({ message: 'Error checking for existing users' });
    }
    
    if (existingUser) {
      return res.status(409).json({ 
        message: 'This email is already registered. Please use a different email or login with your existing account.',
        errors: { email: 'Email already registered' }
      });
    }
    
    // Create user metadata - this will be used by the trigger to create the profile
    const userMetadata = {
      role: role, // ADDED: Include role in metadata
      full_name: full_name,
      phone: phone,
      cultural_affiliation: cultural_affiliation,
      agreed_to_terms: terms_agreed,
      ethics_agreed: ethics_agreed,
      safety_agreed: safety_agreed || false,
      newsletter_agreed: newsletter_agreed || false,
      authProvider: 'email'
    };
    
    // Get the base URL for the redirect
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://' + req.get('host')
      : `${req.protocol}://${req.get('host')}`;
    
    // Create user in auth - the trigger will automatically create the profile
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userMetadata,
        emailRedirectTo: `${baseUrl}/login?verified=true`
      }
    });
    
    if (error) {
      if (error.message.includes('already registered')) {
        return res.status(409).json({ 
          message: 'This email is already registered.',
          errors: { email: 'Email already registered' }
        });
      }
      return res.status(400).json({ message: error.message });
    }
    
    if (!data?.user) {
      return res.status(500).json({ message: 'No user data returned from signup process' });
    }
    
    // Update the auto-created profile with any additional fields that weren't in metadata
    // This prevents the duplicate key error since the profile was already created by the trigger
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        role: role, // ADDED: Ensure role is set in the profile
        email: email, // Ensure email is set in the profile
        phone: phone,
        cultural_affiliation: cultural_affiliation,
        agreed_to_terms: terms_agreed,
        ethics_agreed: ethics_agreed,
        safety_agreed: safety_agreed || false,
        newsletter_agreed: newsletter_agreed || false,
        terms_agreed_at: new Date().toISOString()
      })
      .eq('id', data.user.id);
    
    if (profileUpdateError) {
      console.error(`Error updating profile: ${profileUpdateError.message}`);
      // Don't fail the signup - the profile was created by trigger, we just couldn't update additional fields
    }
    
    return res.status(201).json({ 
      message: 'Account created successfully. Please check your email to verify your account.', 
      user: {
        id: data.user.id,
        email: data.user.email,
        role: role, // CHANGED: Use the actual role from form
        full_name: full_name,
        cultural_affiliation: cultural_affiliation
      },
      emailConfirmationRequired: true
    });
  } catch (error) {
    console.error(`Signup error: ${error.message}`);
    return res.status(500).json({ message: `Server error: ${error.message}` });
  }
});

// Cultural Signup Endpoint (for Google users) - UPDATED TO HANDLE ROLE
app.post('/api/signup-cultural', async (req, res) => {
  try {
    if (!req.session.googleProfile) {
      return res.status(400).json({ message: 'Google profile data not found. Please try logging in with Google again.' });
    }
    
    const googleProfile = req.session.googleProfile;
    const { 
      role, // ADDED: Capture role from request body
      full_name,
      phone,
      cultural_affiliation,
      terms_agreed,
      ethics_agreed,
      safety_agreed,
      newsletter_agreed
    } = req.body;
    
    // Basic validation
    const errors = {};
    
    if (!role) errors.role = 'Role is required'; // ADDED: Validate role
    if (!full_name) errors.full_name = 'Full name is required';
    if (!phone) errors.phone = 'Phone number is required';
    if (!cultural_affiliation || cultural_affiliation.length === 0) {
      errors.cultural_affiliation = 'Cultural affiliation is required';
    }
    if (!terms_agreed) errors.terms_agreed = 'You must agree to the Terms of Service and Privacy Policy';
    if (!ethics_agreed) errors.ethics_agreed = 'You must agree to respect cultural protocols';
    
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    
    // Create user metadata
    const userMetadata = {
      role: role, // ADDED: Include role in metadata
      full_name: full_name || googleProfile.full_name,
      phone: phone,
      cultural_affiliation: cultural_affiliation,
      agreed_to_terms: terms_agreed,
      ethics_agreed: ethics_agreed,
      safety_agreed: safety_agreed || false,
      newsletter_agreed: newsletter_agreed || false,
      authProvider: 'google',
      googleId: googleProfile.googleId
    };
    
    // Create new user in Supabase Auth - this will trigger automatic profile creation
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: googleProfile.email,
      password: Math.random().toString(36).slice(-10), // Random password
      email_confirm: true,
      user_metadata: userMetadata
    });
    
    if (createError) {
      console.error(`Error creating user: ${createError.message}`);
      return res.status(400).json({ message: createError.message });
    }
    
    // Update the auto-created profile with additional fields
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        role: role, // ADDED: Ensure role is set in the profile
        email: googleProfile.email, // Ensure email is set
        phone: phone,
        cultural_affiliation: cultural_affiliation,
        agreed_to_terms: terms_agreed,
        ethics_agreed: ethics_agreed,
        safety_agreed: safety_agreed || false,
        newsletter_agreed: newsletter_agreed || false,
        terms_agreed_at: new Date().toISOString(),
        avatar_url: googleProfile.picture
      })
      .eq('id', newUser.user.id);
    
    if (profileUpdateError) {
      console.error(`Error updating profile: ${profileUpdateError.message}`);
      // Don't fail the signup - the profile was created by trigger, we just couldn't update additional fields
    }
    
    // Store user data in session
    req.session.user = {
      id: newUser.user.id,
      email: newUser.user.email,
      role: role, // CHANGED: Use the actual role from form
      full_name: full_name || googleProfile.full_name,
      cultural_affiliation: cultural_affiliation
    };
    
    delete req.session.googleProfile;
    
    const redirectUrl = getDashboardUrlByRole(role); // CHANGED: Use the actual role
    
    return res.status(201).json({ 
      message: 'Account created successfully!', 
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        role: role, // CHANGED: Use the actual role from form
        full_name: full_name || googleProfile.full_name,
        cultural_affiliation: cultural_affiliation
      },
      redirectUrl
    });
  } catch (error) {
    console.error(`Cultural signup error: ${error.message}`);
    return res.status(500).json({ message: `Server error: ${error.message}` });
  }
});

// Login Endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      if (error.message.includes('Email not confirmed')) {
        return res.status(403).json({ 
          message: 'Please confirm your email address before logging in.',
          emailVerified: false
        });
      }
      return res.status(400).json({ message: error.message });
    }
    
    // Get user profile with cultural information
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    if (profileError) {
      console.error(`Error fetching profile: ${profileError.message}`);
      return res.status(500).json({ message: 'Error loading user profile' });
    }
    
    req.session.user = {
      id: data.user.id,
      email: data.user.email,
      role: profile.role,
      full_name: profile.full_name,
      cultural_affiliation: profile.cultural_affiliation
    };
    
    const dashboardUrl = getDashboardUrlByRole(profile.role);
    
    return res.status(200).json({ 
      message: 'Login successful', 
      user: {
        id: data.user.id,
        email: data.user.email,
        role: profile.role,
        full_name: profile.full_name,
        cultural_affiliation: profile.cultural_affiliation
      },
      redirectUrl: dashboardUrl
    });
  } catch (error) {
    console.error(`Login error: ${error.message}`);
    return res.status(500).json({ message: 'An error occurred during login' });
  }
});

// Logout Endpoint
app.post('/api/logout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Supabase logout error:", error);
    }
    
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destruction error:", err);
        return res.status(500).json({ message: 'Failed to logout' });
      }
      res.clearCookie('connect.sid');
      res.status(200).json({ message: 'Logged out successfully' });
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ message: 'An error occurred during logout' });
  }
});

// Auth Status Endpoint
app.get('/api/auth/status', async (req, res) => {
  if (req.session.user) {
    // Refresh profile data from database
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, full_name, cultural_affiliation, is_verified')
        .eq('id', req.session.user.id)
        .single();
      
      if (!error && profile) {
        // Ensure req.session.user exists
        req.session.user.role = profile.role;
        req.session.user.full_name = profile.full_name;
        req.session.user.cultural_affiliation = profile.cultural_affiliation;
        req.session.user.is_verified = profile.is_verified;
      }
    } catch (err) {
      console.error('Error refreshing user status:', err);
    }
    
    return res.status(200).json({ 
      authenticated: true, 
      user: req.session.user 
    });
  }
  
  return res.status(200).json({ authenticated: false });
});

// Apply for Contributor Role
app.post('/api/apply-contributor', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const { knowledge_domains, experience, motivation } = req.body;
    
    if (!knowledge_domains || !experience || !motivation) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Store application in database (you'll need to create an applications table)
    const { error } = await supabase
      .from('contributor_applications')
      .insert({
        user_id: req.session.user.id,
        knowledge_domains,
        experience,
        motivation,
        status: 'pending'
      });
    
    if (error) {
      console.error('Error saving application:', error);
      return res.status(500).json({ message: 'Error submitting application' });
    }
    
    res.status(200).json({ message: 'Application submitted for review' });
  } catch (error) {
    console.error('Application error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Serve HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'html', 'landing.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'signup.html'));
});

app.get('/signup-cultural', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend','html', 'signup-cultural.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Digital Sangoma Server running on port ${PORT}`);
});