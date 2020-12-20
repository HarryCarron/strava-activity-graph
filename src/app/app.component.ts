import { Component, OnInit } from "@angular/core";
import { UtilitiesService } from "./utilities.service";
import * as moment from "moment";

const ONE_KM_TIME = 3.53;
const UPPER_DISTANCE_LIMIT = 10000;
const LOWER_DISTANCE_LIMIT = 100;

interface WeekInfo {
  displayDate: string;
  isBeginingOfWeek: boolean;
}

export interface WeeklyData {
  distance: number;
  time: number;
  week: WeekInfo;
  elevation: number;
  highestWeeklyDistance: number;
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

  data: WeeklyData[];

  /**
   * Generates random distance. Format 00.00;
   */
  private getRandomDistance() {
    return (
      (Math.floor(
        Math.random() * (UPPER_DISTANCE_LIMIT - LOWER_DISTANCE_LIMIT + 1)
      ) +
        LOWER_DISTANCE_LIMIT) /
      LOWER_DISTANCE_LIMIT
    );
  }
  private getWeek(i: number): WeekInfo {
    const week = (_i: number) => moment().week((12 - _i) * -1);
    const format = (rawWeek) => rawWeek.format("D MMM");
    const weekBegining = week(i - 1);
    const weekEnding = week(i);

    const displayDate = `${format(weekBegining)} - ${format(weekEnding)}`;
    return {
      displayDate,
      isBeginingOfWeek: weekBegining.date() <= 7,
    };
  }

  private buildTestData(): WeeklyData[] {
    const formatTime = (i: number) => (Math.round(i * 100) / 100).toFixed(2);

    let highestWeeklyDistance = 0;

    return this.utilities.arrayOfLength(12).map((weekNumber) => {
      const distance = this.getRandomDistance();
      if (distance > highestWeeklyDistance) {
        highestWeeklyDistance = Math.ceil(distance);
      }

      const time = parseFloat((distance * ONE_KM_TIME).toFixed(2));

      const elevation = Math.floor(Math.random() * (300 - 10 + 1) + 10 / 10);

      return {
        distance,
        time,
        elevation,
        highestWeeklyDistance,
        week: this.getWeek(weekNumber),
      };
    });
  }

  ngOnInit() {
    this.data = this.buildTestData();
  }
}
