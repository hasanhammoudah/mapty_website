'use strict';

let map, mapEvent;

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords; // [lat,lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    // this.type ='cycling';
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}
// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  constructor() {
   
    // Get users's position
    this._getPosition();
    // Get data from local storage
    this._getLocalStorage();
    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    //  this.reset();
  }
  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(work=>{
      this._renderWorkoutMarker(work);
     })
  }
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    // Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    e.preventDefault();

    // Get data from Form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert('Inputs have to be positive numbers!');
      }
      //   if (!Number.isFinite(distance) || !Number.isFinite(duration) || !Number.isFinite(cadence))
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration, elevation)
      ) {
        return alert('Inputs have to be positive numbers!');
      }
      //   if (!Number.isFinite(distance) || !Number.isFinite(duration) || !Number.isFinite(cadence))
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);
    //console.log(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + clear input fields
    this._hideForm();

    // Set Local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    //console.log(mapEvent);
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">4.6</span>
            <span class="workout__unit">min/km</span>
          </div>
        `;
    if (workout.type === 'running')
      html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">min</span>
          </div>
           </li>
          `;

    if (workout.type === 'cycling')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
          </li>`;
    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    //console.log(workoutEl);
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    //console.log(workout);
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    // using the public interface
    //workout.click();
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage(){
   const data = JSON.parse(localStorage.getItem('workouts'));
   //console.log(data);
   if(!data) return;
   this.#workouts = data;
   this.#workouts.forEach(work=>{
    this._renderWorkout(work);
   });
 
  }
  reset(){
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();







// ------------------------------------------------------------------------------------
// الشرح باللغة العربية:
// 1. `this.id = (Date.now() + '').slice(-10);`:
//    - تُستخدم لاستخراج آخر 10 أرقام من الطابع الزمني.
// 
// 2. `this.pace = this.duration / this.distance;`:
//    - تُحسب السرعة (Pace) كنسبة المدة الزمنية إلى المسافة.
// 
// 3. `this._setDescription();`:
//    - تُستخدم لتعيين وصف النشاط، مع الأخذ في الاعتبار نوع النشاط وتاريخ حدوثه.
// 
// 4. `constructor(coords, distance, duration) {...}`:
//    - هي دالة مُنشئ (Constructor) تُستخدم لإنشاء كائن جديد من الكلاس وتعيين الخصائص.
// 
// 5. `(...inputs)`:
//    - تُستخدم لجمع جميع المدخلات كقائمة.
// 
// 6. `validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));`:
//    - تُستخدم للتحقق مما إذا كانت جميع المدخلات أرقام صحيحة.
// 
// 7. `this._loadMap.bind(this)`:
//    - تُستخدم لضمان أن `this` داخل الدالة يُشير إلى الكائن الحالي (instance) بدلاً من السياق الذي يتم فيه استدعاء الدالة.
// 
// 8. `e.preventDefault();`:
//    - تُستخدم لمنع الإجراء الافتراضي للحدث، مثل إعادة تحميل الصفحة عند إرسال نموذج.
// 
// 9. `const { lat, lng } = this.#mapEvent.latlng;`:
//    - تُستخدم لتفكيك القيم `lat` و`lng` من الكائن `latlng` بسهولة.
// 
// 10. `workout = new Cycling([lat, lng], distance, duration, elevation);`:
//    - هنا، يتم تمرير مصفوفة تحتوي على إحداثيات `lat` و`lng` كمعاملات.
// 
// 11. `this.#map.setView(workout.coords, this.#mapZoomLevel, {...});`:
//    - تُستخدم لتعيين عرض الخريطة على إحداثيات معينة مع مستوى تكبير محدد.
// 
// 12. `closest`:
//    - تُستخدم للإشارة إلى الكائن الأقرب أو العنصر الأقرب في سياق معين.
// 
// 13. `this`:
//    - تُستخدم للإشارة إلى الكائن الحالي داخل الكلاس أو الدالة.
// ------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------
// Explanation in English:
// 1. `this.id = (Date.now() + '').slice(-10);`:
//    - Used to extract the last 10 digits from the timestamp.
// 
// 2. `this.pace = this.duration / this.distance;`:
//    - Calculates the pace as the ratio of duration to distance.
// 
// 3. `this._setDescription();`:
//    - Used to set the description of the workout, taking into account the type and date of the activity.
// 
// 4. `constructor(coords, distance, duration) {...}`:
//    - This is a constructor function used to create a new instance of the class and set properties.
// 
// 5. `(...inputs)`:
//    - Used to gather all inputs into a list.
// 
// 6. `validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));`:
//    - Used to check if all inputs are finite numbers.
// 
// 7. `this._loadMap.bind(this)`:
//    - Used to ensure that `this` inside the function refers to the current instance instead of the context in which the function is called.
// 
// 8. `e.preventDefault();`:
//    - Used to prevent the default action of the event, such as reloading the page when submitting a form.
// 
// 9. `const { lat, lng } = this.#mapEvent.latlng;`:
//    - Used to destructure the `lat` and `lng` values from the `latlng` object easily.
// 
// 10. `workout = new Cycling([lat, lng], distance, duration, elevation);`:
//    - Here, an array containing the `lat` and `lng` coordinates is passed as arguments.
// 
// 11. `this.#map.setView(workout.coords, this.#mapZoomLevel, {...});`:
//    - Used to set the map view to specific coordinates with a defined zoom level.
// 
// 12. `closest`:
//    - Used to refer to the nearest object or element in a specific context.
// 
// 13. `this`:
//    - Used to refer to the current object within the class or function.
// ------------------------------------------------------------------------------------
