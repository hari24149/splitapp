function startClock() {
  async function updateClock() {
    const timeEl = document.getElementById('time');
    const ampmEl = document.getElementById('ampm');
    const dayDateEl = document.getElementById('dayDate');

    if (!timeEl) return; // If clock elements not present, skip

    try {
      // Try fetching from WorldTimeAPI
      const res = await fetch('https://worldtimeapi.org/api/ip');
      if (!res.ok) throw new Error('API response error');
      const data = await res.json();
      updateClockUI(new Date(data.datetime));
    } catch (err) {
      console.warn('Time API failed, using local system time', err);
      updateClockUI(new Date());
    }
  }

  function updateClockUI(dateObj) {
    const timeEl = document.getElementById('time');
    const ampmEl = document.getElementById('ampm');
    const dayDateEl = document.getElementById('dayDate');

    let hours = dateObj.getHours();
    const minutes = dateObj.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12 || 12;
    timeEl.textContent = `${hours}:${minutes.toString().padStart(2, '0')}`;
    ampmEl.textContent = ampm;

    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const day = days[dateObj.getDay()];
    const month = months[dateObj.getMonth()];
    const date = dateObj.getDate();
    const suffix = (d) => d > 3 && d < 21 ? 'th' : ['st','nd','rd'][((d % 10)-1)] || 'th';

    if (dayDateEl)
      dayDateEl.textContent = `${day}, ${month} ${date}${suffix(date)}`;
  }

  updateClock();
  setInterval(updateClock, 60000); // Update every minute
}
