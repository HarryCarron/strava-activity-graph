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
const LOWER_DISTANCE_LIMIT_M = 5000;

export const NUMBER_OF_WEEKS = 12;

export interface WeekInfo {
  displayDate: string;
  isBeginingOfMonth: boolean;
  distance: number;
  time: string;
  elevation: number;
  monthShort: string;
}

interface ActivityData {
  run: TwelveWeekData;
  cycle: TwelveWeekData;
  swim: TwelveWeekData;
}

export enum activityType {
  run,
  cycle,
  swim,
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

  data: ActivityData;

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
   */
  private secondsToHoursMinutesHumanReadable(seconds: number): string {
    const date = new Date(1970, 0, 1);
    date.setSeconds(seconds);
    return `${date.getHours()}h ${date.getMinutes()}m`;
  }

  private getWeek(i: number, isSwim: boolean): WeekInfo {
    const week = (offset: number) => moment().subtract(offset, "weeks");
    const format = (rawWeek) => rawWeek.format("D MMM");
    const weekBegining = week(i);
    const weekEnding = week(i - 1);
    let elevation;
    const distance = this.getRandomDistance();
    if (!isSwim) {
      elevation = Math.floor(Math.random() * (300 - 10 + 1) + 10);
    }

    const time = this.secondsToHoursMinutesHumanReadable(
      Math.ceil(distance * ONE_M_TIME_S)
    );
    const isBeginingOfMonth = weekBegining.date() <= 7;
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

  private buildTestData(): ActivityData {
    const output = {};

    this.utilities.arrayOfLength(3).forEach((e) => {
      let highestWeeklyDistance = 0;
      const weeks = this.utilities
        .arrayOfLength(NUMBER_OF_WEEKS)
        .map((weekNumber) => {
          const week = this.getWeek(weekNumber, e === 2);

          if (week.distance > highestWeeklyDistance) {
            highestWeeklyDistance = Math.ceil(week.distance);
          }

          return week;
        })
        .reverse();

      const activity = {
        highestWeeklyDistance,
        weeks,
      };

      output[activityType[e]] = activity as TwelveWeekData;
    });
    return output as ActivityData;
  }

  ngOnInit() {
    this.data = this.buildTestData();
  }
}
