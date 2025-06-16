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
    document.getElementById('username').textContent = username || 'Student';
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
        console.log('Current URL:', window.location.href);
        console.log('Fetching:', new URL('data/modules.json', window.location.href).href);
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
 * Load detailed module content
 */
async function loadModuleContent(moduleId) {
    try {
        const response = await fetch(`data/content/module-${moduleId}-content.json`);
        if (response.ok) {
            const content = await response.json();
            populateDetailedContent(content);
        }
    } catch (error) {
        console.log('Detailed content not available for module', moduleId);
    }
}

/**
 * Populate detailed module content
 */
function populateDetailedContent(content) {
    const moduleContent = document.getElementById('module-content');
    
    // Add detailed content section after existing sections
    let detailedSection = document.getElementById('detailed-content');
    if (!detailedSection) {
        detailedSection = document.createElement('section');
        detailedSection.id = 'detailed-content';
        detailedSection.className = 'module-section';
        moduleContent.appendChild(detailedSection);
    }
    
    detailedSection.innerHTML = `
        <h2>Detailed Instructions</h2>
        <div class="content-sections">
            ${content.sections.map(section => `
                <div class="content-section">
                    <h3>${section.title}</h3>
                    <div class="section-duration">${section.duration}</div>
                    <div class="section-content">
                        ${section.content.map(item => renderContentItem(item)).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Render individual content items
 */
function renderContentItem(item) {
    switch (item.type) {
        case 'text':
            return `<p>${item.content}</p>`;
        case 'heading':
            return `<h4>${item.content}</h4>`;
        case 'steps':
            return `<ol>${item.content.map(step => `<li>${step}</li>`).join('')}</ol>`;
        case 'image':
            return `<div class="content-image">
                <img src="${item.src}" alt="${item.alt}" />
                <caption>${item.caption}</caption>
            </div>`;
        case 'code':
            return `<pre><code class="language-${item.language}">${item.content}</code></pre>`;
        case 'warning':
            return `<div class="warning-box">⚠️ ${item.content}</div>`;
        case 'tip':
            return `<div class="tip-box">💡 ${item.content}</div>`;
        case 'success':
            return `<div class="success-box">✅ ${item.content}</div>`;
        default:
            return `<p>${item.content}</p>`;
    }
}

/**
 * Populate module navigation sidebar
 */
function populateModuleNav() {
    const moduleNav = document.getElementById('module-nav');
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
    document.getElementById('welcome-screen').style.display = 'block';
    document.getElementById('module-content').style.display = 'none';
    
    // Update active module in sidebar
    document.querySelectorAll('.module-item').forEach(item => {
        item.classList.remove('active');
    });
}

/**
 * Load and display specific module
 */
function loadModule(moduleId) {
    const module = moduleData.modules.find(m => m.id === moduleId);
    if (!module) return;
    
    currentModule = module;
    
    // Hide welcome screen, show module content
    document.getElementById('welcome-screen').style.display = 'none';
    document.getElementById('module-content').style.display = 'block';
    
    // Update active module in sidebar
    document.querySelectorAll('.module-item').forEach((item, index) => {
        item.classList.remove('active');
        if (index === moduleId - 1) {
            item.classList.add('active');
        }
    });
    
    // Populate module content
    populateModuleContent(module);
    loadModuleContent(moduleId);
    
    // Update navigation buttons
    updateNavigationButtons(moduleId);
    
    // Update user progress
    userProgress.currentModule = moduleId;
    userProgress.lastAccessed = new Date().toISOString();
    saveUserProgress();
    
    // Scroll to top
    document.querySelector('.main-content').scrollTop = 0;
}

/**
 * Populate module content
 */
function populateModuleContent(module) {
    // Module header
    document.getElementById('module-title').textContent = module.title;
    document.getElementById('module-duration').textContent = module.duration;
    document.getElementById('module-week').textContent = `Week ${module.id}`;
    
    // Module description and objectives
    document.getElementById('module-description').textContent = module.description;
    
    const objectivesList = document.getElementById('module-objectives');
    objectivesList.innerHTML = '';
    module.objectives.forEach(objective => {
        const li = document.createElement('li');
        li.textContent = objective;
        objectivesList.appendChild(li);
    });
    
    // Videos
    populateVideos(module.videos);
    
    // GitHub section
    populateGitHub(module.github);
    
    // Assignment
    populateAssignment(module.assignment);
    
    // Update completion button
    updateCompletionButton(module.id);
}

/**
 * Populate video section
 */
function populateVideos(videos) {
    const videoGrid = document.getElementById('video-grid');
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
    document.getElementById('github-description').textContent = github.description;
    
    const viewBtn = document.getElementById('view-repo-btn');
    viewBtn.onclick = () => window.open(github.repo, '_blank');
    
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
    document.getElementById('assignment-title').textContent = assignment.title;
    document.getElementById('assignment-description').textContent = assignment.description;
    document.getElementById('assignment-due').textContent = assignment.dueDate;
    document.getElementById('submission-type').textContent = assignment.submission.toUpperCase();
    
    // Create submission interface based on type
    const submissionArea = document.getElementById('submission-area');
    
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
        completeBtn.style.transform = 'scale(1.1)';
        setTimeout(() => {
            completeBtn.style.transform = 'scale(1)';
        }, 200);
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
    
    document.getElementById('overall-progress').textContent = progressPercentage;
    document.getElementById('progress-fill').style.width = `${progressPercentage}%`;
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
document.getElementById('submit-btn').addEventListener('click', function() {
    if (!currentModule) return;
    
    const assignment = currentModule.assignment;
    let submissionData = {};
    
    if (assignment.submission === 'github') {
        const githubUrl = document.getElementById('github-url').value;
        if (!githubUrl) {
            showToast('Please enter your GitHub repository URL', 'error');
            return;
        }
        submissionData.url = githubUrl;
    } else if (assignment.submission === 'text') {
        const textContent = document.getElementById('text-submission').value;
        if (!textContent.trim()) {
            showToast('Please write your response', 'error');
            return;
        }
        submissionData.text = textContent;
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

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
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