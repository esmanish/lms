// Dashboard functionality for VR LMS
let moduleData = {};
let currentModule = null;
let userProgress = {};

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    // Load user data
    loadUserData();
    
    // Load modules data
    loadModules();
    
    // Initialize progress tracking
    initializeProgress();
});

/**
 * Check if user is authenticated
 */
function checkAuth() {
    const userType = sessionStorage.getItem('userType');
    const username = sessionStorage.getItem('username');
    
    if (!userType || userType !== 'student') {
        window.location.href = 'login.html';
        return;
    }
    
    // Set username in header
    const usernameElement = document.getElementById('username');
    if (usernameElement) {
        usernameElement.textContent = username || 'Student';
    }
}

/**
 * Load user progress data
 */
function loadUserData() {
    // Load from localStorage or initialize
    const savedProgress = localStorage.getItem('userProgress');
    if (savedProgress) {
        userProgress = JSON.parse(savedProgress);
    } else {
        // Initialize progress for all modules
        userProgress = {
            completed: [],
            currentModule: 1,
            lastAccessed: new Date().toISOString()
        };
        saveUserProgress();
    }
}

/**
 * Load modules data from JSON
 */
async function loadModules() {
    try {
        console.log('Loading modules...');
        const response = await fetch('data/modules.json');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Loaded data:', data);
        moduleData = data;
        
        populateModuleNav();
        showWelcomeScreen();
        
    } catch (error) {
        console.error('Error details:', error);
        // Fallback with inline data
        moduleData = {
            modules: [
                {id: 1, title: "VR Demo Experience", duration: "1 hour", description: "First VR experience", objectives: ["Experience VR"], videos: [], github: {repo: "#", description: "Demo"}, assignment: {title: "Reflection", description: "Write reflection", submission: "text", dueDate: "Week 1"}}
            ]
        };
        populateModuleNav();
        showWelcomeScreen();
        showToast('Using fallback data', 'warning');
    }
}

/**
 * Populate module navigation sidebar
 */
function populateModuleNav() {
    const moduleNav = document.getElementById('module-nav');
    if (!moduleNav) return;
    
    moduleNav.innerHTML = '';
    
    moduleData.modules.forEach((module, index) => {
        const moduleItem = document.createElement('div');
        moduleItem.className = 'module-item';
        moduleItem.onclick = () => loadModule(module.id);
        
        // Add completed class if module is completed
        if (userProgress.completed.includes(module.id)) {
            moduleItem.classList.add('completed');
        }
        
        moduleItem.innerHTML = `
            <div class="module-number">${module.id}</div>
            <div class="module-info">
                <div class="module-name">${module.title}</div>
                <div class="module-duration">${module.duration}</div>
            </div>
        `;
        
        moduleNav.appendChild(moduleItem);
    });
}

/**
 * Show welcome screen
 */
function showWelcomeScreen() {
    const welcomeScreen = document.getElementById('welcome-screen');
    const moduleContent = document.getElementById('module-content');
    
    if (welcomeScreen) welcomeScreen.style.display = 'block';
    if (moduleContent) moduleContent.style.display = 'none';
    
    // Update active module in sidebar
    document.querySelectorAll('.module-item').forEach(item => {
        item.classList.remove('active');
    });
}

/**
 * Load and display specific module
 */
async function loadModule(moduleId) {
    const module = moduleData.modules.find(m => m.id === moduleId);
    if (!module) return;
    
    currentModule = module;
    
    // Hide welcome screen, show module content
    const welcomeScreen = document.getElementById('welcome-screen');
    const moduleContent = document.getElementById('module-content');
    
    if (welcomeScreen) welcomeScreen.style.display = 'none';
    if (moduleContent) moduleContent.style.display = 'block';
    
    // Update active module in sidebar
    document.querySelectorAll('.module-item').forEach((item, index) => {
        item.classList.remove('active');
        if (index === moduleId - 1) {
            item.classList.add('active');
        }
    });
    
    // Try to load detailed content from individual module file
    let detailedContent = null;
    try {
        console.log(`Loading content for module ${moduleId}`);
        const contentResponse = await fetch(`data/content/module-${moduleId}-content.json`);
        console.log('Content response status:', contentResponse.status);
        
        if (contentResponse.ok) {
            const rawResponse = await contentResponse.text();
            console.log('Raw response:', rawResponse);
            
            if (rawResponse.trim()) {
                detailedContent = JSON.parse(rawResponse);
                console.log('Content loaded:', detailedContent);
            } else {
                console.log('Empty content file');
            }
        }
    } catch (error) {
        console.log(`No detailed content for module ${moduleId}, using basic data:`, error.message);
    }
    
    // Use detailed content if available, otherwise fall back to basic module data
    const contentToUse = detailedContent || module;
    
    // Populate module content
    populateModuleContent(contentToUse);
    
    // Update navigation buttons
    updateNavigationButtons(moduleId);
    
    // Update user progress
    userProgress.currentModule = moduleId;
    userProgress.lastAccessed = new Date().toISOString();
    saveUserProgress();
    
    // Scroll to top
    const mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.scrollTop = 0;
    
    // Track module access
    if (window.progressTracker) {
        window.progressTracker.startModuleTracking(moduleId);
    }
}

/**
 * Populate module content (supports both basic and detailed formats)
 */
function populateModuleContent(content) {
    // Check if this is detailed content with sections
    if (content.sections && Array.isArray(content.sections)) {
        populateDetailedContent(content);
    } else {
        populateBasicContent(content);
    }
    
    // Update completion button
    updateCompletionButton(content.id || content.moduleId);
}

/**
 * Populate detailed content with sections
 */
function populateDetailedContent(content) {
    // Module header
    const moduleTitle = document.getElementById('module-title');
    const moduleDuration = document.getElementById('module-duration');
    const moduleWeek = document.getElementById('module-week');
    
    if (moduleTitle) moduleTitle.textContent = content.title;
    if (moduleDuration) moduleDuration.textContent = content.duration || "1 hour";
    if (moduleWeek) moduleWeek.textContent = `Week ${content.moduleId}`;
    
    // Module overview
    const moduleDescription = document.getElementById('module-description');
    if (moduleDescription) moduleDescription.textContent = content.overview;
    
    // Learning objectives
    const objectivesList = document.getElementById('module-objectives');
    if (objectivesList && content.objectives) {
        objectivesList.innerHTML = '';
        content.objectives.forEach(objective => {
            const li = document.createElement('li');
            li.textContent = objective;
            objectivesList.appendChild(li);
        });
    }
    
    // Videos
    if (content.videos) populateVideos(content.videos);
    
    // GitHub section
    if (content.github) populateGitHub(content.github);
    
    // Assignment
    if (content.assignment) populateAssignment(content.assignment);
}

/**
 * Populate basic content format
 */
function populateBasicContent(module) {
    // Module header
    const moduleTitle = document.getElementById('module-title');
    const moduleDuration = document.getElementById('module-duration');
    const moduleWeek = document.getElementById('module-week');
    
    if (moduleTitle) moduleTitle.textContent = module.title;
    if (moduleDuration) moduleDuration.textContent = module.duration;
    if (moduleWeek) moduleWeek.textContent = `Week ${module.id}`;
    
    // Module description and objectives
    const moduleDescription = document.getElementById('module-description');
    if (moduleDescription) moduleDescription.textContent = module.description;
    
    const objectivesList = document.getElementById('module-objectives');
    if (objectivesList && module.objectives) {
        objectivesList.innerHTML = '';
        module.objectives.forEach(objective => {
            const li = document.createElement('li');
            li.textContent = objective;
            objectivesList.appendChild(li);
        });
    }
    
    // Videos
    if (module.videos) populateVideos(module.videos);
    
    // GitHub section
    if (module.github) populateGitHub(module.github);
    
    // Assignment
    if (module.assignment) populateAssignment(module.assignment);
}

/**
 * Populate video section
 */
function populateVideos(videos) {
    const videoGrid = document.getElementById('video-grid');
    if (!videoGrid) return;
    
    videoGrid.innerHTML = '';
    
    videos.forEach((video, index) => {
        const videoCard = document.createElement('div');
        videoCard.className = 'video-card';
        
        videoCard.innerHTML = `
            <iframe class="video-player" 
                    src="${video.url}" 
                    title="${video.title}"
                    frameborder="0" 
                    allowfullscreen>
            </iframe>
            <div class="video-info">
                <div class="video-title">${video.title}</div>
                <div class="video-duration">${video.duration}</div>
            </div>
        `;
        
        videoGrid.appendChild(videoCard);
    });
}

/**
 * Populate GitHub section
 */
function populateGitHub(github) {
    const githubDescription = document.getElementById('github-description');
    if (githubDescription) githubDescription.textContent = github.description;
    
    const viewBtn = document.getElementById('view-repo-btn');
    if (viewBtn) {
        viewBtn.onclick = () => window.open(github.repo, '_blank');
    }
    
    // Store repo URL for clone command
    window.currentRepoUrl = github.repo;
}

/**
 * Copy clone command to clipboard
 */
function copyCloneCommand() {
    const repoUrl = window.currentRepoUrl;
    const cloneCommand = `git clone ${repoUrl}`;
    
    navigator.clipboard.writeText(cloneCommand).then(() => {
        showToast('Clone command copied to clipboard!');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = cloneCommand;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Clone command copied to clipboard!');
    });
}

/**
 * Populate assignment section
 */
function populateAssignment(assignment) {
    const assignmentTitle = document.getElementById('assignment-title');
    const assignmentDescription = document.getElementById('assignment-description');
    const assignmentDue = document.getElementById('assignment-due');
    const submissionType = document.getElementById('submission-type');
    
    if (assignmentTitle) assignmentTitle.textContent = assignment.title;
    if (assignmentDescription) assignmentDescription.textContent = assignment.description;
    if (assignmentDue) assignmentDue.textContent = assignment.dueDate;
    if (submissionType) submissionType.textContent = assignment.submission.toUpperCase();
    
    // Create submission interface based on type
    const submissionArea = document.getElementById('submission-area');
    if (!submissionArea) return;
    
    if (assignment.submission === 'github') {
        submissionArea.innerHTML = `
            <div style="color: var(--gray); margin-bottom: 15px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 10px;">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                </svg>
                <br>Submit your GitHub repository URL
            </div>
            <input type="url" id="github-url" placeholder="https://github.com/username/repository" 
                   style="width: 100%; padding: 12px; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; background: rgba(255,255,255,0.05); color: #fff; margin-bottom: 15px;">
        `;
    } else if (assignment.submission === 'text') {
        submissionArea.innerHTML = `
            <div style="color: var(--gray); margin-bottom: 15px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 10px;">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <br>Write your response below
            </div>
            <textarea id="text-submission" placeholder="Type your assignment response here..." 
                      style="width: 100%; height: 120px; padding: 12px; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; background: rgba(255,255,255,0.05); color: #fff; resize: vertical;"></textarea>
        `;
    }
}

/**
 * Update navigation buttons
 */
function updateNavigationButtons(moduleId) {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    if (!prevBtn || !nextBtn) return;
    
    // Previous button
    if (moduleId === 1) {
        prevBtn.disabled = true;
        prevBtn.style.opacity = '0.5';
    } else {
        prevBtn.disabled = false;
        prevBtn.style.opacity = '1';
    }
    
    // Next button
    if (moduleId === moduleData.modules.length) {
        nextBtn.disabled = true;
        nextBtn.style.opacity = '0.5';
    } else {
        nextBtn.disabled = false;
        nextBtn.style.opacity = '1';
    }
}

/**
 * Navigate to previous/next module
 */
function navigateModule(direction) {
    if (!currentModule) return;
    
    const newModuleId = currentModule.id + direction;
    
    if (newModuleId >= 1 && newModuleId <= moduleData.modules.length) {
        loadModule(newModuleId);
    }
}

/**
 * Update completion button state
 */
function updateCompletionButton(moduleId) {
    const completeBtn = document.getElementById('complete-btn');
    if (!completeBtn) return;
    
    const isCompleted = userProgress.completed.includes(moduleId);
    
    if (isCompleted) {
        completeBtn.classList.add('completed');
        completeBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Completed
        `;
    } else {
        completeBtn.classList.remove('completed');
        completeBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Mark Complete
        `;
    }
}

/**
 * Toggle module completion
 */
function toggleModuleCompletion() {
    if (!currentModule) return;
    
    const moduleId = currentModule.id;
    const isCompleted = userProgress.completed.includes(moduleId);
    
    if (isCompleted) {
        // Remove from completed
        userProgress.completed = userProgress.completed.filter(id => id !== moduleId);
        showToast('Module marked as incomplete');
    } else {
        // Add to completed
        userProgress.completed.push(moduleId);
        showToast('Module completed! 🎉');
        
        // Add completed animation
        const completeBtn = document.getElementById('complete-btn');
        if (completeBtn) {
            completeBtn.style.transform = 'scale(1.1)';
            setTimeout(() => {
                completeBtn.style.transform = 'scale(1)';
            }, 200);
        }
    }
    
    // Update UI
    updateCompletionButton(moduleId);
    populateModuleNav();
    updateOverallProgress();
    saveUserProgress();
}

/**
 * Initialize progress tracking
 */
function initializeProgress() {
    updateOverallProgress();
}

/**
 * Update overall progress
 */
function updateOverallProgress() {
    const totalModules = moduleData.modules ? moduleData.modules.length : 12;
    const completedCount = userProgress.completed.length;
    const progressPercentage = Math.round((completedCount / totalModules) * 100);
    
    const overallProgress = document.getElementById('overall-progress');
    const progressFill = document.getElementById('progress-fill');
    
    if (overallProgress) overallProgress.textContent = progressPercentage;
    if (progressFill) progressFill.style.width = `${progressPercentage}%`;
}

/**
 * Save user progress to localStorage
 */
function saveUserProgress() {
    localStorage.setItem('userProgress', JSON.stringify(userProgress));
}

/**
 * Submit assignment
 */
document.addEventListener('DOMContentLoaded', function() {
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', function() {
            if (!currentModule) return;
            
            const assignment = currentModule.assignment;
            let submissionData = {};
            
            if (assignment.submission === 'github') {
                const githubUrl = document.getElementById('github-url');
                if (!githubUrl || !githubUrl.value) {
                    showToast('Please enter your GitHub repository URL', 'error');
                    return;
                }
                submissionData.url = githubUrl.value;
            } else if (assignment.submission === 'text') {
                const textContent = document.getElementById('text-submission');
                if (!textContent || !textContent.value.trim()) {
                    showToast('Please write your response', 'error');
                    return;
                }
                submissionData.text = textContent.value;
            }
            
            // Save submission (in real app, this would go to server)
            const submissions = JSON.parse(localStorage.getItem('submissions') || '{}');
            submissions[currentModule.id] = {
                ...submissionData,
                submittedAt: new Date().toISOString(),
                moduleId: currentModule.id
            };
            localStorage.setItem('submissions', JSON.stringify(submissions));
            
            showToast('Assignment submitted successfully! ✅');
            
            // Auto-complete module on submission
            if (!userProgress.completed.includes(currentModule.id)) {
                toggleModuleCompletion();
            }
        });
    }
});

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    if (!toast || !toastMessage) return;
    
    toastMessage.textContent = message;
    
    // Set color based on type
    if (type === 'error') {
        toast.style.background = 'var(--error)';
    } else {
        toast.style.background = 'var(--success)';
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * Logout function
 */
function logout() {
    sessionStorage.clear();
    window.location.href = 'login.html';
}