const API_BASE_URL =
    window.location.hostname === "localhost"
        ? "https://localhost:7108/api"
        : "https://192.168.1.47:7108/api";

export default API_BASE_URL;