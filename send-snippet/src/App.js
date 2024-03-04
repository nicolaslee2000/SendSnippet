import logo from "./logo.svg";
import "./App.css";

function App() {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText("hihihi");
      console.log("copied to clipboard");
    } catch (err) {
      console.log(err.message);
    }
  };
  return (
    <div className="App">
      <div>hiaaaaa</div>
      <button onClick={copy}>copy</button>
    </div>
  );
}

export default App;
