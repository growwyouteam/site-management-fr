/**
 * Debug Authentication Issues
 * Helps debug token storage and API requests
 */

export const debugAuth = () => {
    console.log('🔍 Debugging Authentication...');

    // Check if token exists
    const token = localStorage.getItem('token');
    console.log('🔑 Token exists:', !!token);

    if (token) {
        console.log('🔑 Token length:', token.length);
        console.log('🔑 Token preview:', token.substring(0, 20) + '...');

        // Check token format (JWT should have 3 parts)
        const parts = token.split('.');
        console.log('🔑 Token parts:', parts.length);

        if (parts.length === 3) {
            try {
                // Decode payload (part 1)
                const payload = JSON.parse(atob(parts[1]));
                console.log('🔑 Token payload:', payload);
                console.log('🔑 Token expires:', new Date(payload.exp * 1000));
                console.log('🔑 Token expired:', payload.exp * 1000 < Date.now());
            } catch (error) {
                console.error('❌ Invalid token format:', error);
            }
        }
    } else {
        console.log('❌ No token found in localStorage');
    }

    // Check user data
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            console.log('👤 User data:', user);
        } catch (error) {
            console.error('❌ Invalid user data:', error);
        }
    }

    console.log('🔍 Authentication debug complete');
};

export const testApiCall = async () => {
    console.log('🧪 Testing API call...');

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('❌ No token available for testing');
            return;
        }

        const response = await fetch('/api/admin/vendors', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('🧪 API Response status:', response.status);
        console.log('🧪 API Response headers:', Object.fromEntries(response.headers.entries()));

        const data = await response.json();
        console.log('🧪 API Response data:', data);

        if (data.success) {
            console.log('✅ API call successful');
            console.log('📊 Vendors count:', data.data?.length || 0);
        } else {
            console.error('❌ API call failed:', data.error);
        }

    } catch (error) {
        console.error('❌ API test failed:', error);
    }
};

export const clearAuth = () => {
    console.log('🗑️ Clearing authentication data...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log('✅ Authentication data cleared');
};

// Auto-run debug on page load
if (typeof window !== 'undefined') {
    window.debugAuth = debugAuth;
    window.testApiCall = testApiCall;
    window.clearAuth = clearAuth;

    // Run debug automatically
    setTimeout(() => {
        console.log('🔍 Running automatic auth debug...');
        debugAuth();
    }, 1000);
}
