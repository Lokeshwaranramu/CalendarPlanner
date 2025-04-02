import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class CalendarPlanner extends LightningElement {
  @track currentMonth = new Date().getMonth();
  @track currentYear = new Date().getFullYear();
  @track weeks = [];
  @track availability = {};

  dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  connectedCallback() {
    this.generateCalendar();
  }

  generateCalendar() {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    const daysCount = lastDay.getDate();
    const startingDay = firstDay.getDay();
    const totalSlots = Math.ceil((startingDay + daysCount) / 7) * 7;
    let days = [];
    let weekId = 0;

    // Fill initial empty slots
    for (let i = 0; i < startingDay; i++) {
      days.push({ day: null });
    }

    // Fill actual days
    for (let day = 1; day <= daysCount; day++) {
      const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const availabilityForDay = this.availability[dateStr] || { start: '', end: '' };
      days.push({
        day,
        date: dateStr,
        start: availabilityForDay.start || '',
        end: availabilityForDay.end || ''
      });
    }

    // Fill remaining slots
    while (days.length < totalSlots) {
      days.push({ day: null });
    }

    // Group into weeks
    this.weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      this.weeks.push({
        weekId: weekId++,
        days: days.slice(i, i + 7)
      });
    }
  }

  handleMonthChange(event) {
    const direction = event.target.dataset.direction;
    if (direction === 'prev') {
      this.currentMonth--;
      if (this.currentMonth < 0) {
        this.currentMonth = 11;
        this.currentYear--;
      }
    } else {
      this.currentMonth++;
      if (this.currentMonth > 11) {
        this.currentMonth = 0;
        this.currentYear++;
      }
    }
    this.generateCalendar();
  }

  handleTimeChange(event) {
    const date = event.target.dataset.date;
    const field = event.target.name;
    const value = event.target.value;
    if (!this.availability[date]) {
      this.availability[date] = { start: '', end: '' };
    }
    this.availability[date][field] = value;

    // Block past dates
    const today = new Date().toLocaleString('en-AU', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');
    if (date < today && value) {
      this.dispatchEvent(
        new ShowToastEvent({
          title: 'Error',
          message: `Cannot set availability in the past for ${date}.`,
          variant: 'error'
        })
      );
      this.availability[date][field] = '';
      this.generateCalendar();
      return;
    }

    // Validation: Ensure end time is not before start time and minimum 15 minutes
    if (this.availability[date].start && this.availability[date].end) {
      const startTime = this.availability[date].start;
      const endTime = this.availability[date].end;
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      const startInMinutes = startHour * 60 + startMinute;
      const endInMinutes = endHour * 60 + endMinute;

      if (endInMinutes <= startInMinutes) {
        this.dispatchEvent(
          new ShowToastEvent({
            title: 'Error',
            message: `End time (${endTime}) must be after start time (${startTime}) for ${date}.`,
            variant: 'error'
          })
        );
        this.availability[date].end = '';
      } else if (endInMinutes - startInMinutes < 15) {
        this.dispatchEvent(
          new ShowToastEvent({
            title: 'Error',
            message: `Availability must be at least 15 minutes for ${date}.`,
            variant: 'error'
          })
        );
        this.availability[date].end = '';
      }
    }

    this.generateCalendar();
  }

  handleResetMonth() {
    this.weeks.forEach(week => {
      week.days.forEach(day => {
        if (day?.date) {
          delete this.availability[day.date];
        }
      });
    });
    this.generateCalendar();
    this.dispatchEvent(
      new ShowToastEvent({
        title: 'Success',
        message: 'Availability reset for this month.',
        variant: 'success'
      })
    );
  }

  get monthYearLabel() {
    return new Date(this.currentYear, this.currentMonth).toLocaleString('en-AU', { month: 'long', year: 'numeric' });
  }
}