const API_BASE_URL =
    window.location.hostname === "localhost"
        ? "https://localhost:7108/api"
        : `${window.location.origin}/api`;

export default API_BASE_URL;
