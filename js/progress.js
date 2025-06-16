// Progress tracking and analytics for VR LMS
class ProgressTracker {
    constructor() {
        this.sessionStart = new Date();
        this.videoWatchTime = {};
        this.moduleTimeSpent = {};
        this.interactions = [];
        this.currentModuleStartTime = null;
        
        this.initializeTracking();
    }
    
    initializeTracking() {
        // Load existing progress data
        this.loadProgressData();
        
        // Start session tracking
        this.startSession();
        
        // Set up periodic saves
        setInterval(() => {
            this.saveProgressData();
        }, 30000); // Save every 30 seconds
        
        // Save on page unload
        window.addEventListener('beforeunload', () => {
            this.endSession();
            this.saveProgressData();
        });
    }
    
    loadProgressData() {
        const savedData = localStorage.getItem('progressTracking');
        if (savedData) {
            const data = JSON.parse(savedData);
            this.videoWatchTime = data.videoWatchTime || {};
            this.moduleTimeSpent = data.moduleTimeSpent || {};
            this.interactions = data.interactions || [];
        }
    }
    
    saveProgressData() {
        const data = {
            videoWatchTime: this.videoWatchTime,
            moduleTimeSpent: this.moduleTimeSpent,
            interactions: this.interactions,
            lastSaved: new Date().toISOString()
        };
        localStorage.setItem('progressTracking', JSON.stringify(data));
    }
    
    startSession() {
        this.logInteraction('session_start', {
            timestamp: this.sessionStart.toISOString(),
            userAgent: navigator.userAgent,
            screenResolution: `${screen.width}x${screen.height}`
        });
    }
    
    endSession() {
        const sessionEnd = new Date();
        const sessionDuration = sessionEnd - this.sessionStart;
        
        this.logInteraction('session_end', {
            timestamp: sessionEnd.toISOString(),
            duration: sessionDuration,
            moduleTimeSpent: this.moduleTimeSpent
        });
    }
    
    startModuleTracking(moduleId) {
        // End previous module tracking
        if (this.currentModuleStartTime && this.currentModule) {
            this.endModuleTracking(this.currentModule);
        }
        
        this.currentModule = moduleId;
        this.currentModuleStartTime = new Date();
        
        this.logInteraction('module_start', {
            moduleId: moduleId,
            timestamp: this.currentModuleStartTime.toISOString()
        });
    }
    
    endModuleTracking(moduleId) {
        if (!this.currentModuleStartTime) return;
        
        const endTime = new Date();
        const timeSpent = endTime - this.currentModuleStartTime;
        
        // Add to total time for this module
        if (!this.moduleTimeSpent[moduleId]) {
            this.moduleTimeSpent[moduleId] = 0;
        }
        this.moduleTimeSpent[moduleId] += timeSpent;
        
        this.logInteraction('module_end', {
            moduleId: moduleId,
            timestamp: endTime.toISOString(),
            timeSpent: timeSpent,
            totalTime: this.moduleTimeSpent[moduleId]
        });
        
        this.currentModuleStartTime = null;
        this.currentModule = null;
    }
    
    trackVideoProgress(videoId, currentTime, duration) {
        if (!this.videoWatchTime[videoId]) {
            this.videoWatchTime[videoId] = {
                totalWatched: 0,
                completionPercentage: 0,
                lastPosition: 0,
                watchSessions: []
            };
        }
        
        const video = this.videoWatchTime[videoId];
        video.lastPosition = currentTime;
        video.completionPercentage = Math.round((currentTime / duration) * 100);
        
        // Track watch session
        const now = new Date().toISOString();
        const lastSession = video.watchSessions[video.watchSessions.length - 1];
        
        if (!lastSession || (new Date() - new Date(lastSession.end)) > 60000) {
            // New session if more than 1 minute gap
            video.watchSessions.push({
                start: now,
                end: now,
                startTime: currentTime,
                endTime: currentTime
            });
        } else {
            // Update current session
            lastSession.end = now;
            lastSession.endTime = currentTime;
        }
    }
    
    trackAssignmentSubmission(moduleId, assignmentType, submissionData) {
        this.logInteraction('assignment_submit', {
            moduleId: moduleId,
            assignmentType: assignmentType,
            submissionData: submissionData,
            timestamp: new Date().toISOString()
        });
    }
    
    trackModuleCompletion(moduleId) {
        this.logInteraction('module_complete', {
            moduleId: moduleId,
            timestamp: new Date().toISOString(),
            timeSpent: this.moduleTimeSpent[moduleId] || 0
        });
    }
    
    trackGitHubInteraction(action, repoUrl) {
        this.logInteraction('github_interaction', {
            action: action, // 'view', 'clone', 'fork'
            repoUrl: repoUrl,
            timestamp: new Date().toISOString()
        });
    }
    
    logInteraction(type, data) {
        this.interactions.push({
            type: type,
            data: data,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 1000 interactions to prevent excessive storage
        if (this.interactions.length > 1000) {
            this.interactions = this.interactions.slice(-1000);
        }
    }
    
    getProgressSummary() {
        const totalModules = 12;
        const userProgress = JSON.parse(localStorage.getItem('userProgress') || '{}');
        const completedModules = userProgress.completed || [];
        
        return {
            overallProgress: Math.round((completedModules.length / totalModules) * 100),
            completedModules: completedModules.length,
            totalModules: totalModules,
            timeSpentTotal: Object.values(this.moduleTimeSpent).reduce((a, b) => a + b, 0),
            averageTimePerModule: this.moduleTimeSpent ? 
                Object.values(this.moduleTimeSpent).reduce((a, b) => a + b, 0) / Object.keys(this.moduleTimeSpent).length : 0,
            videosWatched: Object.keys(this.videoWatchTime).length,
            assignmentsSubmitted: this.interactions.filter(i => i.type === 'assignment_submit').length
        };
    }
    
    getModuleProgress(moduleId) {
        const timeSpent = this.moduleTimeSpent[moduleId] || 0;
        const interactions = this.interactions.filter(i => i.data && i.data.moduleId === moduleId);
        const userProgress = JSON.parse(localStorage.getItem('userProgress') || '{}');
        const isCompleted = (userProgress.completed || []).includes(moduleId);
        
        return {
            moduleId: moduleId,
            timeSpent: timeSpent,
            completed: isCompleted,
            interactions: interactions.length,
            lastAccessed: interactions.length > 0 ? interactions[interactions.length - 1].timestamp : null
        };
    }
    
    exportProgress() {
        const summary = this.getProgressSummary();
        const detailedData = {
            summary: summary,
            moduleProgress: {},
            videoProgress: this.videoWatchTime,
            interactions: this.interactions,
            exportedAt: new Date().toISOString()
        };
        
        // Add module-specific progress
        for (let i = 1; i <= 12; i++) {
            detailedData.moduleProgress[i] = this.getModuleProgress(i);
        }
        
        return detailedData;
    }
    
    // Advanced analytics
    getLearningPatterns() {
        const moduleAccess = {};
        const timeOfDayAccess = Array(24).fill(0);
        const dayOfWeekAccess = Array(7).fill(0);
        
        this.interactions.forEach(interaction => {
            const timestamp = new Date(interaction.timestamp);
            const hour = timestamp.getHours();
            const day = timestamp.getDay();
            
            timeOfDayAccess[hour]++;
            dayOfWeekAccess[day]++;
            
            if (interaction.data && interaction.data.moduleId) {
                const moduleId = interaction.data.moduleId;
                if (!moduleAccess[moduleId]) {
                    moduleAccess[moduleId] = 0;
                }
                moduleAccess[moduleId]++;
            }
        });
        
        return {
            mostActiveHour: timeOfDayAccess.indexOf(Math.max(...timeOfDayAccess)),
            mostActiveDay: dayOfWeekAccess.indexOf(Math.max(...dayOfWeekAccess)),
            moduleAccessFrequency: moduleAccess,
            totalInteractions: this.interactions.length
        };
    }
    
    // Study streak calculation
    getStudyStreak() {
        const dates = new Set();
        this.interactions.forEach(interaction => {
            const date = new Date(interaction.timestamp).toDateString();
            dates.add(date);
        });
        
        const sortedDates = Array.from(dates).sort((a, b) => new Date(b) - new Date(a));
        let currentStreak = 0;
        let maxStreak = 0;
        let tempStreak = 0;
        
        for (let i = 0; i < sortedDates.length; i++) {
            const currentDate = new Date(sortedDates[i]);
            const nextDate = i + 1 < sortedDates.length ? new Date(sortedDates[i + 1]) : null;
            
            if (i === 0) {
                tempStreak = 1;
                // Check if today
                const today = new Date().toDateString();
                if (currentDate.toDateString() === today) {
                    currentStreak = 1;
                }
            } else if (nextDate) {
                const daysDiff = Math.floor((currentDate - nextDate) / (1000 * 60 * 60 * 24));
                if (daysDiff === 1) {
                    tempStreak++;
                    if (i === 0 || currentStreak > 0) {
                        currentStreak = tempStreak;
                    }
                } else {
                    maxStreak = Math.max(maxStreak, tempStreak);
                    tempStreak = 1;
                    if (currentStreak === 0) {
                        currentStreak = 0;
                    }
                }
            }
        }
        
        maxStreak = Math.max(maxStreak, tempStreak);
        
        return {
            currentStreak: currentStreak,
            maxStreak: maxStreak,
            totalDaysActive: dates.size
        };
    }
}

// Initialize global progress tracker
window.progressTracker = new ProgressTracker();

// Helper functions for integration with dashboard
function updateProgressDisplay() {
    const summary = window.progressTracker.getProgressSummary();
    
    // Update progress bar in header
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('overall-progress');
    
    if (progressFill && progressText) {
        progressFill.style.width = `${summary.overallProgress}%`;
        progressText.textContent = summary.overallProgress;
    }
    
    // Update other progress indicators if they exist
    const elements = {
        'completed-modules': summary.completedModules,
        'total-time': formatTime(summary.timeSpentTotal),
        'videos-watched': summary.videosWatched,
        'assignments-submitted': summary.assignmentsSubmitted
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

function formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m`;
    } else {
        return `${seconds}s`;
    }
}

// Auto-update progress display
setInterval(updateProgressDisplay, 5000);

// Export function for debugging/admin use
window.exportLearningData = function() {
    const data = window.progressTracker.exportProgress();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vr-lms-progress-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
};