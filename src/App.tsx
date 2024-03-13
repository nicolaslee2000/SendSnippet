import "./App.css";
import Layout from "./components/Layout/Layout";

function App() {
  return (
    <div className="App">
      <Layout />
      <div>
        <button
          onClick={() => {
            console.log(new Date());
          }}
        >
          test
        </button>
      </div>
    </div>
  );
}

export default App;
