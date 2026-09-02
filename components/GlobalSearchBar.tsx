export default function GlobalSearchBar() {
    return (
      <form
        className="searchBox"
        action="/buscar"
        method="get"
      >
        <span>🔎</span>
  
        <input
          type="search"
          name="q"
          placeholder="Buscar en Uniónutriita..."
          aria-label="Buscar en Uniónutriita"
          required
        />
  
        <button
          type="submit"
          style={{
            border: 0,
            background: "transparent",
            color: "#657a5b",
            fontWeight: 800,
            padding: "4px",
          }}
        >
          Buscar
        </button>
      </form>
    );
  }
  