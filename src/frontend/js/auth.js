// auth.js
const auth = {
    isLoggedIn: function() {
        return sessionStorage.getItem('user') !== null;
    },

    getCurrentUser: function() {
        const userData = sessionStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    },

    getUserRole: function() {
        const user = this.getCurrentUser();
        return user?.role || 'seeker';
    },

    getAccessToken: function() {
        return sessionStorage.getItem('access_token');
    },

    getCulturalAffiliation: function() {
        const user = this.getCurrentUser();
        return user?.cultural_affiliation || [];
    },

    isVerifiedContributor: function() {
        const user = this.getCurrentUser();
        return user?.role === 'contributor' && user?.is_verified === true;
    },

    isModerator: function() {
        const user = this.getCurrentUser();
        return user?.role === 'moderator';
    },

    isSeeker: function() {
        const user = this.getCurrentUser();
        return user?.role === 'seeker';
    },

    handleLogin: function(userData) {
        try {
            // Create user object with all profile fields
            const user = {
                id: userData.id,
                email: userData.email,
                role: userData.role || 'seeker',
                full_name: userData.full_name || '',
                phone: userData.phone || '',
                cultural_affiliation: userData.cultural_affiliation || [],
                is_verified: userData.is_verified || false,
                authProvider: userData.authProvider || 'email',
                created_at: userData.created_at || new Date().toISOString()
            };

            // Store user data in sessionStorage
            sessionStorage.setItem('user', JSON.stringify(user));

            // Store tokens if available
            if (userData.session) {
                sessionStorage.setItem('access_token', userData.session.access_token);
                sessionStorage.setItem('refresh_token', userData.session.refresh_token);
            }

            return true;
        } catch (error) {
            console.error('Login handling error:', error);
            return false;
        }
    },

    handleCulturalLogin: function(userData) {
        try {
            // Create user object with cultural-specific fields
            const user = {
                id: userData.id,
                email: userData.email,
                role: userData.role || 'seeker',
                full_name: userData.full_name || '',
                cultural_affiliation: userData.cultural_affiliation || [],
                is_verified: userData.is_verified || false,
                authProvider: userData.authProvider || 'google',
                created_at: userData.created_at || new Date().toISOString()
            };

            // Store user data in sessionStorage
            sessionStorage.setItem('user', JSON.stringify(user));

            return true;
        } catch (error) {
            console.error('Cultural login handling error:', error);
            return false;
        }
    },

    handleLogout: function() {
        try {
            // Clear all auth-related data from sessionStorage
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('access_token');
            sessionStorage.removeItem('refresh_token');
            
            // Also clear any cultural-specific data
            sessionStorage.removeItem('cultural_context');
            sessionStorage.removeItem('knowledge_preferences');
            
            return true;
        } catch (error) {
            console.error('Logout handling error:', error);
            return false;
        }
    },

    // Cultural context management
    setCulturalContext: function(context) {
        try {
            sessionStorage.setItem('cultural_context', JSON.stringify(context));
            return true;
        } catch (error) {
            console.error('Error setting cultural context:', error);
            return false;
        }
    },

    getCulturalContext: function() {
        try {
            const context = sessionStorage.getItem('cultural_context');
            return context ? JSON.parse(context) : null;
        } catch (error) {
            console.error('Error getting cultural context:', error);
            return null;
        }
    },

    // Knowledge preferences
    setKnowledgePreferences: function(preferences) {
        try {
            sessionStorage.setItem('knowledge_preferences', JSON.stringify(preferences));
            return true;
        } catch (error) {
            console.error('Error setting knowledge preferences:', error);
            return false;
        }
    },

    getKnowledgePreferences: function() {
        try {
            const preferences = sessionStorage.getItem('knowledge_preferences');
            return preferences ? JSON.parse(preferences) : null;
        } catch (error) {
            console.error('Error getting knowledge preferences:', error);
            return null;
        }
    },

    // Check if user can contribute knowledge
    canContribute: function() {
        const user = this.getCurrentUser();
        return user && (user.role === 'contributor' || user.role === 'moderator') && user.is_verified;
    },

    // Check if user can moderate content
    canModerate: function() {
        return this.isModerator();
    },

    // Get user's display info for cultural context
    getUserCulturalContext: function() {
        const user = this.getCurrentUser();
        if (!user) return null;

        return {
            cultural_affiliation: user.cultural_affiliation,
            is_verified: user.is_verified,
            role: user.role
        };
    }
};

// Export for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = auth;
}

// Make available in browser global scope
if (typeof window !== 'undefined') {
    window.auth = auth;
}