import { Component, Input } from "@angular/core";
import { WeeklyData } from "./../../app.component";

@Component({
  selector: "app-activity-graph",
  templateUrl: "./activity-graph.component.html",
  styleUrls: ["./activity-graph.component.css"],
})
export class ActivityGraphComponent {
  constructor() {}

  @Input() data: WeeklyData[];
}
