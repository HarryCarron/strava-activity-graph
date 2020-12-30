import { Component, OnInit } from "@angular/core";
import { UtilitiesService } from "./utilities.service";
import * as moment from "moment";

/**
 * One Kilometer time in seconds
 */
const ONE_M_TIME_S = 0.21;
/**
 * Distance upper limit in meters
 */
const UPPER_DISTANCE_LIMIT_M = 100000;
/**
 * Distance lower limit in meters
 */
const LOWER_DISTANCE_LIMIT_M = 50000;

interface WeekInfo {
  displayDate: string;
  isBeginingOfMonth: boolean;
  distance: number;
  time: string;
  elevation: number;
  monthShort: string;
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
  constructor(private utilities: UtilitiesService) {}

  data: TwelveWeekData;

  /**
   * Generates random distance in meters
   */
  private getRandomDistance(): number {
    return Math.floor(
      Math.random() * (UPPER_DISTANCE_LIMIT_M - LOWER_DISTANCE_LIMIT_M + 1) +
        LOWER_DISTANCE_LIMIT_M
    );
  }

  /**
   * Converts ellapsed time (seconds) to human readable format 00m 00m
   * @param seconds Ellpased time in seconds
   *
   */
  private secondsToHoursMinutesHumanReadable(seconds: number): string {
    const date = new Date(1970, 0, 1);
    date.setSeconds(seconds);
    return `${date.getHours()}h ${date.getMinutes()}m`;
  }

  private getWeek(i: number): WeekInfo {
    const week = (offset: number) => moment().subtract(offset, "weeks");
    const format = (rawWeek) => rawWeek.format("D MMM");
    const weekBegining = week(i);
    const weekEnding = week(i - 1);
    let distance;
    if (i === 0) {
      // ! remove! testing purposes only!
      distance = 0;
    } else {
      distance = this.getRandomDistance();
    }
    const time = this.secondsToHoursMinutesHumanReadable(
      Math.ceil(distance * ONE_M_TIME_S)
    );
    const isBeginingOfMonth = weekBegining.date() <= 7;
    const elevation = Math.floor(Math.random() * (300 - 10 + 1) + 10);
    const displayDate =
      i === 0 ? "This Week" : `${format(weekBegining)} - ${format(weekEnding)}`;
    const monthShort = weekBegining.format("MMM");

    return {
      displayDate,
      isBeginingOfMonth,
      distance,
      time,
      elevation,
      monthShort,
    };
  }

  private buildTestData(): TwelveWeekData {
    let highestWeeklyDistance = 0;

    const weeks = this.utilities
      .arrayOfLength(12)
      .map((weekNumber) => {
        const week = this.getWeek(weekNumber);

        if (week.distance > highestWeeklyDistance) {
          highestWeeklyDistance = Math.ceil(week.distance);
        }

        return week;
      })
      .reverse();

    return {
      highestWeeklyDistance,
      weeks,
    };
  }

  ngOnInit() {
    this.data = this.buildTestData();
    console.log(this.data);
  }
}
