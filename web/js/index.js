addEventListener('load', () => {

    fillAgentList();

    initiateSkewScroll();

    initializeSearch();

    // EEL EXPOSING
    eel.expose( alertUser );
    eel.expose( askUserToChooseAgent );
    eel.expose( changeStatus );
    eel.expose( hideStopButton )

})

function fillAgentList() {

    fetch("./json/agents.json")
    .then((response) => response.json())
    .then((agentJSON) => {
        
        let agents = Object.keys( agentJSON );

        for (const agent of agents) {

            let agent_div = document.createElement("div");
            agent_div.className = "agent";
            agent_div.id = agent;

            agent_div.setAttribute('onclick', `pickAgent('${agent}')`);
    
            let agent_div_thumbnail = document.createElement("img");
            agent_div_thumbnail.className = "agent-thumb";
            agent_div_thumbnail.src = `./assets/images/agent-banners/${ agent.toLowerCase() }.png`;
    
            let agent_div_name = document.createElement("p");
            agent_div_name.innerText = agent;

            agent_div.appendChild( agent_div_thumbnail );
            agent_div.appendChild( agent_div_name );

            document.getElementById("agents").appendChild(agent_div);

        }

    })

}

function alertUser(statusText = '', chosenAgentText = '') {

    gtag('event', 'app_state_change', {
        'state_name': 'alert',
        'status_text': statusText,
        'agent_name': chosenAgentText
    });

    let status = document.getElementById('status');
    let chosenAgent = document.getElementById('chosen-agent');
    let agent_preview = document.getElementById('agent-preview');

    agent_preview.src ='./assets/images/slurp.gif';
    status.innerText = statusText;
    chosenAgent.innerText = chosenAgentText;
    
}

function askUserToChooseAgent() {

    gtag('event', 'app_state_change', {
        'state_name': 'choose_agent',
        'status_text': 'CHOOSE AN AGENT'
    });

    let status = document.getElementById('status');
    let chosenAgent = document.getElementById('chosen-agent');
    let agent_preview = document.getElementById('agent-preview');
 
    agent_preview.src ='./assets/images/slurp.gif';
    status.innerText = "CHOOSE AN AGENT";
    chosenAgent.innerText = "..."

}

function changeStatus(status) {

    gtag('event', 'app_state_change', {
        'state_name': 'status_update',
        'status_text': status
    });

    if (status == 'LOCKED') {

        gtag('event', 'agent_locked', {
            'agent_name': document.getElementById('chosen-agent').innerText
        });

    }

    document.getElementById('status').innerText = status;

}

function initiateSkewScroll() {

    const section = document.querySelector('#agents');

    let currentPos = section.scrollTop;

    const update = () => {
        let newPos = section.scrollTop;
        let diff = newPos - currentPos;
        let speed = diff * 0.3;
        if (speed > 10) speed = 10;
        if (speed < -10) speed = -10;
        section.style.transform = `skewY(${ speed }deg)`;
        
        currentPos = newPos;
        requestAnimationFrame(update);
    }

    update();

}

function pickAgent( agent ) {

    document.getElementById('status').innerText = "WAITING FOR PRE-GAME"
    document.getElementById('chosen-agent').innerText = agent.toUpperCase();
    document.getElementById('agent-preview').src = `./assets/images/agent-previews/${ agent.toLowerCase()}-preview.gif`;
    showStopButton();
    
    gtag('event', 'agent_selected', {
        'agent_name': agent
    });
    
    eel.try_lock(agent);

}

function initializeSearch() {

    const searchInput = document.getElementById('agent-search');

    function levenshteinDistance (s, t) {

        if (!s.length) return t.length;
        if (!t.length) return s.length;
 
        return Math.min(
                levenshteinDistance(s.substr(1), t) + 1,
                levenshteinDistance(t.substr(1), s) + 1,
                levenshteinDistance(s.substr(1), t.substr(1)) + (s.charAt(0).toLowerCase() !== t.charAt(0).toLowerCase() ? 1 : 0)
        );

    }

    searchInput.addEventListener('input', (e) => {

        const searchTerm = e.target.value.toLowerCase().trim();
        const agents = document.querySelectorAll('.agent');

        let showAgents = [];
        let hideAgents = [];
        
        agents.forEach(agent => {

            const agentName = agent.querySelector('p').innerText.toLowerCase();

            if (agentName.includes(searchTerm)) {
                showAgents.push({agent: agent, agentName: agentName});
            }

            else {
                hideAgents.push({agent: agent, agentName: agentName});
            }

        });

        if (showAgents.length == 0) {

            for (const agentStatus of hideAgents) {

                if ( levenshteinDistance(searchTerm, agentStatus.agentName) < 3 ) {
                    showAgents.push(agentStatus);
                    hideAgents = hideAgents.filter(agent => agent !== agentStatus);
                }
    
            }

        }


        for (const agentStatus of showAgents) {
            agentStatus.agent.classList.remove('hidden');
        };
        for (const agentStatus of hideAgents) {
            agentStatus.agent.classList.add('hidden');
        }

    });

}

function showStopButton() {

    const button = bootstrap.Collapse.getOrCreateInstance( document.getElementById("stop-button-flex-row") );
    button.show();

}

function hideStopButton() {

    const button = bootstrap.Collapse.getOrCreateInstance( document.getElementById("stop-button-flex-row") );
    button.hide();

}

function stopLocking() {

    eel.stop_lock();
    askUserToChooseAgent();

}

function openInstagram() {
    
    gtag('event', 'social_clicked', {
        'platform': 'instagram'
    });

    eel.open_instagram();

}

function openGithub() {

    gtag('event', 'social_clicked', {
        'platform': 'github'
    });

    eel.open_github();

}
