import { Component, OnInit } from "@angular/core";
import { UtilitiesService } from "./utilities.service";
import * as moment from "moment";

const ONE_KM_TIME = 3.53;
const UPPER_DISTANCE_LIMIT = 10000;
const LOWER_DISTANCE_LIMIT = 100;

interface WeekInfo {
  displayDate: string;
  isBeginingOfWeek: boolean;
  distance: number;
  time: number;
  elevation: number;
}

export interface TwelveWeekData {
  weeks: WeekInfo[];
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

  data: TwelveWeekData;

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
    const week = (ii: number) => moment().week((12 - ii) * -1);
    const format = (rawWeek) => rawWeek.format("D MMM");
    const weekBegining = week(i - 1);
    const weekEnding = week(i);
    const distance = this.getRandomDistance();
    const time = parseFloat((distance * ONE_KM_TIME).toFixed(2));
    const elevation = Math.floor(Math.random() * (300 - 10 + 1) + 10 / 10);
    const displayDate = `${format(weekBegining)} - ${format(weekEnding)}`;
    return {
      displayDate,
      isBeginingOfWeek: weekBegining.date() <= 7,
      distance,
      time,
      elevation,
    };
  }

  private buildTestData(): TwelveWeekData {
    let highestWeeklyDistance = 0;

    const weeks = this.utilities.arrayOfLength(12).map((weekNumber) => {
      const week = this.getWeek(weekNumber);

      if (week.distance > highestWeeklyDistance) {
        highestWeeklyDistance = Math.ceil(week.distance);
      }

      return week;
    });

    return {
      highestWeeklyDistance,
      weeks,
    };
  }

  ngOnInit() {
    this.data = this.buildTestData();
  }
}
