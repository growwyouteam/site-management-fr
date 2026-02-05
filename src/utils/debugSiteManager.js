/**
 * Debug Site Manager Issues
 * Helps diagnose why site manager dashboard shows no data
 */

import api from '../services/api';

export const debugSiteManager = async () => {
    console.log('🔍 Starting Site Manager Debug...');

    try {
        // 1. Check if user is authenticated
        const token = localStorage.getItem('token');
        console.log('📝 Token exists:', !!token);

        if (!token) {
            console.error('❌ No authentication token found');
            return { error: 'No authentication token' };
        }

        // 2. Test dashboard API
        console.log('🔄 Testing dashboard API...');
        const dashboardResponse = await api.get('/site/dashboard');
        console.log('✅ Dashboard API Response:', dashboardResponse.data);

        if (dashboardResponse.data.success) {
            const data = dashboardResponse.data.data;
            console.log('📊 Dashboard Data:', {
                userName: data.user?.name,
                userRole: data.user?.role,
                assignedSites: data.user?.assignedSites,
                assignedProjectsCount: data.assignedProjects?.length || 0,
                labourCount: data.labourCount || 0,
                attendanceCount: data.todayAttendance?.length || 0,
                notificationsCount: data.notifications?.length || 0
            });

            // 3. Check if user has assigned sites
            if (!data.user?.assignedSites || data.user.assignedSites.length === 0) {
                console.warn('⚠️ User has no assigned sites');
                console.log('💡 Solution: Admin needs to assign projects to this site manager');
                return {
                    warning: 'No assigned sites',
                    solution: 'Admin needs to assign projects to this site manager',
                    userData: data.user
                };
            }

            // 4. Check if assigned sites have projects
            if (data.assignedProjects && data.assignedProjects.length === 0) {
                console.warn('⚠️ No projects found for assigned sites');
                console.log('💡 Solution: Check if projects exist and are properly assigned');
                return {
                    warning: 'No projects found',
                    solution: 'Check if projects exist and are properly assigned',
                    assignedSites: data.user.assignedSites
                };
            }

            console.log('✅ Site Manager dashboard is working correctly');
            return { success: true, data };

        } else {
            console.error('❌ Dashboard API failed:', dashboardResponse.data.error);
            return { error: dashboardResponse.data.error };
        }

    } catch (error) {
        console.error('❌ Debug failed:', error);

        if (error.response) {
            console.log('🔍 Error Details:', {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            });

            if (error.response.status === 401) {
                console.log('💡 Solution: Token expired, please login again');
            } else if (error.response.status === 403) {
                console.log('💡 Solution: User is not a site manager');
            } else if (error.response.status === 404) {
                console.log('💡 Solution: API endpoint not found, check backend routes');
            }
        }

        return { error: error.message };
    }
};

export const testProjectAssignment = async () => {
    console.log('🔍 Testing Project Assignment...');

    try {
        // Check user role first
        const userResponse = await api.get('/site/dashboard');
        if (userResponse.data.success) {
            const user = userResponse.data.data.user;
            console.log('👤 Current User:', {
                name: user.name,
                role: user.role,
                assignedSites: user.assignedSites
            });

            // Only try admin endpoints if user is admin
            if (user.role === 'admin') {
                // Get all projects
                const projectsResponse = await api.get('/admin/projects');
                console.log('📋 All Projects:', projectsResponse.data);

                if (projectsResponse.data.success) {
                    const projects = projectsResponse.data.data;
                    console.log(`📊 Found ${projects.length} projects`);

                    projects.forEach(project => {
                        console.log(`🏗️ Project: ${project.name}`, {
                            id: project._id,
                            assignedManager: project.assignedManager,
                            managerName: project.assignedManager?.name
                        });
                    });

                    return { success: true, projects };
                }
            } else {
                console.log('ℹ️ User is not admin, cannot access admin endpoints');
                return {
                    info: 'User is not admin',
                    userRole: user.role,
                    assignedSites: user.assignedSites
                };
            }
        }
    } catch (error) {
        console.error('❌ Failed to test project assignment:', error);
        return { error: error.message };
    }
};

export const fixSiteManagerAssignment = async (siteManagerId, projectIds) => {
    console.log('🔧 Attempting to fix site manager assignment...');

    try {
        // Update user's assigned sites
        const userResponse = await api.put(`/admin/users/${siteManagerId}`, {
            assignedSites: projectIds
        });

        if (userResponse.data.success) {
            console.log('✅ Site manager assignment updated');
            return { success: true };
        } else {
            console.error('❌ Failed to update assignment:', userResponse.data.error);
            return { error: userResponse.data.error };
        }
    } catch (error) {
        console.error('❌ Failed to fix assignment:', error);
        return { error: error.message };
    }
};

// Auto-run debug function
export const runSiteManagerDebug = async () => {
    console.log('🚀 Running Site Manager Debug...');

    const results = {
        dashboard: await debugSiteManager()
    };

    // Only try project testing if dashboard succeeded
    if (results.dashboard.success || results.dashboard.warning) {
        results.projects = await testProjectAssignment();
    } else {
        results.projects = { error: 'Skipped due to dashboard failure' };
    }

    console.log('📊 Debug Results:', results);
    return results;
};
