import { Component, OnInit } from "@angular/core";
import { UtilitiesService } from "./utilities.service";
import * as moment from "moment";

const ONE_KM_TIME = 3.53;
const UPPER_DISTANCE_LIMIT = 10000;
const LOWER_DISTANCE_LIMIT = 100;

interface WeeklyData {
  distance: number;
  time: number;
  displayWeek: string;
}

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})
export class AppComponent implements OnInit {
  /**
   *
   */
  constructor(private utilities: UtilitiesService) {}

  data: WeeklyData[]; // todo

  /**
   * Generates random distance. Format 00.00;
   */
  private getRandomDistance() {
    return (
      (Math.floor(
        Math.random() * (UPPER_DISTANCE_LIMIT - LOWER_DISTANCE_LIMIT + 1)
      ) +
        LOWER_DISTANCE_LIMIT) /
      100
    );
  }
  private getWeek(i: number): string {
    const week = (_i: number) =>
      moment()
        .week((12 - _i) * -1)
        .format("D MMM");
    const weekBegining = week(i - 1);
    const weekEnding = week(i);

    const displayDate = `${weekBegining} - ${weekEnding}`;
    return displayDate;
  }

  private buildTestData(): WeeklyData[] {
    const formatTime = (i: number) => (Math.round(i * 100) / 100).toFixed(2);

    return this.utilities.arrayOfLength(12).map((week, i) => {
      const distance = this.getRandomDistance();

      const time = parseFloat((distance * ONE_KM_TIME).toFixed(2));

      return {
        distance,
        time,
        displayWeek: this.getWeek(i),
      };
    });
  }

  ngOnInit() {
    console.log(this.buildTestData());
  }
}
