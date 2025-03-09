document.addEventListener("DOMContentLoaded", function () {
    const connectWalletBtn = document.getElementById("connectWallet");
    const registerBtn = document.getElementById("register");
    const loginBtn = document.getElementById("login");
    const logoutBtn = document.getElementById("logout");  // Add the logout button
    const walletAddressDisplay = document.getElementById("walletAddress");
    const nonceDisplay = document.getElementById("nonce");
    const messageDisplay = document.getElementById("message");
    const loginMetaMaskBtn = document.getElementById("login-metamask");
    const userAddressDisplay = document.getElementById("user-address");
    const errorMessageDisplay = document.getElementById("error-message");

    let web3;
    let userWallet = "";
    let nonce = "";

    // Connect to MetaMask
    connectWalletBtn.addEventListener("click", async function () {
        if (window.ethereum) {
            try {
                web3 = new Web3(window.ethereum);
                const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
                userWallet = accounts[0];
                walletAddressDisplay.innerText = `Wallet: ${userWallet}`;

                // Fetch nonce from backend
                const response = await fetch("http://127.0.0.1:8000/api/get_nonce/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ wallet_address: userWallet }),
                });

                const data = await response.json();
                if (response.ok) {
                    nonce = data.nonce;
                    nonceDisplay.innerText = `Nonce: ${nonce}`;
                    messageDisplay.innerText = "Wallet connected. Register or login.";
                } else {
                    messageDisplay.innerText = data.error;
                }
            } catch (error) {
                console.error(error);
                messageDisplay.innerText = "Error connecting to MetaMask.";
            }
        } else {
            messageDisplay.innerText = "MetaMask not installed!";
        }
    });

    // Register User
    registerBtn.addEventListener("click", async function () {
        if (!userWallet) {
            alert("Connect MetaMask first!");
            return;
        }

        const response = await fetch("http://127.0.0.1:8000/api/register/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ wallet_address: userWallet }),
        });

        const data = await response.json();
        if (response.ok) {
            messageDisplay.innerText = "Registered successfully. Sign the nonce to login.";
            nonce = data.nonce;
            nonceDisplay.innerText = `Nonce: ${nonce}`;
        } else {
            messageDisplay.innerText = data.error;
        }
    });

    // Login User
    loginBtn.addEventListener("click", async function () {
        if (!userWallet || !nonce) {
            alert("Connect MetaMask & get nonce first!");
            return;
        }

        try {
            const messageToSign = `Sign this message to verify your identity: ${nonce}`;
            const signature = await web3.eth.personal.sign(messageToSign, userWallet, "");

            const response = await fetch("http://127.0.0.1:8000/api/login/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ wallet_address: userWallet, signature }),
            });

            const data = await response.json();
            if (response.ok) {
                messageDisplay.innerText = "Login successful!";
            } else {
                messageDisplay.innerText = data.error;
            }
        } catch (error) {
            console.error(error);
            messageDisplay.innerText = "Signing failed.";
        }
    });
    // Logout User
    logoutBtn.addEventListener("click", async function () {
        // Clear the session data on the frontend
        userWallet = "";
        nonce = "";

        walletAddressDisplay.innerText = "";
        nonceDisplay.innerText = "";
        messageDisplay.innerText = "Logged out successfully.";

        // Optionally, notify the backend to invalidate the session (if you're using sessions or tokens)
        const response = await fetch("http://127.0.0.1:8000/api/logout/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });

        const data = await response.json();
        if (response.ok) {
            console.log("Backend session invalidated");
        } else {
            console.log("Failed to invalidate session on backend");
        }

        // Optionally, clear local storage if you store tokens there
        // localStorage.clear();
    });

    // Additional MetaMask login logic for new button
    loginMetaMaskBtn.addEventListener("click", async () => {
        if (typeof window.ethereum !== "undefined") {
            const web3 = new Web3(window.ethereum);
            try {
                // Request MetaMask connection
                const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
                const userAddress = accounts[0];
                userAddressDisplay.innerText = `Connected: ${userAddress}`;
                errorMessageDisplay.innerText = "";

                // Get the nonce from the backend
                const response = await fetch('/api/get_nonce/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ wallet_address: userAddress })
                });

                const data = await response.json();
                const nonce = data.nonce;

                // Ask the user to sign the nonce using MetaMask
                const signature = await web3.eth.personal.sign(nonce, userAddress);

                // Send the wallet address and signature to the backend for verification
                const loginResponse = await fetch('/api/login/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ wallet_address: userAddress, signature: signature })
                });

                const loginData = await loginResponse.json();
                if (loginData.message === "Login successful") {
                    // Redirect to the dashboard or another page after successful login
                    window.location.href = loginData.redirect_url;
                } else {
                    errorMessageDisplay.innerText = loginData.error;
                }

            } catch (error) {
                console.error(error);
                errorMessageDisplay.innerText = "An error occurred. Check the console.";
            }
        } else {
            alert("MetaMask not detected. Please install it from https://metamask.io/");
        }
    });
});
