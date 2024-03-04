import React from "react";
import "./tabContainer.css";
export default function tabContainer() {
  return (
    <div className="tabContainer">
      <div className="pcss3t pcss3t-effect-scale pcss3t-theme-1">
        <input
          type="radio"
          name="pcss3t"
          checked
          id="tab1"
          className="tab-content-first"
        />
        <label for="tab1">
          <i className="icon-bolt"></i>Send
        </label>

        <input type="radio" name="pcss3t" id="tab2" className="tab-content-2" />
        <label for="tab2">
          <i className="icon-picture"></i>Receive
        </label>

        <ul>
          <li className="tab-content tab-content-first typography">
            {/* <h1>Nikola Tesla</h1>
            <p>
              Serbian-American inventor, electrical engineer, mechanical
              engineer, physicist, and futurist best known for his contributions
              to the design of the modern alternating current (AC) electrical
              supply system.
            </p> */}
            <textarea></textarea>
            <button>Send</button>
            <button>Reset</button>
          </li>

          <li className="tab-content tab-content-2 typography">
            <h1>Leonardo da Vinci</h1>
            <p>
              Italian Renaissance polymath: painter, sculptor, architect,
              musician, mathematician, engineer, inventor, anatomist, geologist,
              cartographer, botanist, and writer. His genius, perhaps more than
              that of any other figure, epitomized the Renaissance humanist
              ideal. Leonardo has often been described as the archetype of the
              Renaissance Man, a man of "unquenchable curiosity" and "feverishly
              inventive imagination". He is widely considered to be one of the
              greatest painters of all time and perhaps the most diversely
              talented person ever to have lived. According to art historian
              Helen Gardner, the scope and depth of his interests were without
              precedent and "his mind and personality seem to us superhuman, the
              man himself mysterious and remote". Marco Rosci states that while
              there is much speculation about Leonardo, his vision of the world
              is essentially logical rather than mysterious, and that the
              empirical methods he employed were unusual for his time.
            </p>
          </li>
        </ul>
      </div>
    </div>
  );
}
