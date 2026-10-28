const API_BASE_URL =
    window.location.hostname === "localhost"
        ? "https://localhost:7108/api"
        : "https://api.amnote.com.vn/api";

export default API_BASE_URL;
