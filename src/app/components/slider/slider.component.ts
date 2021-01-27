import { Component, OnInit, Output, EventEmitter } from "@angular/core";

@Component({
  selector: "app-slider",
  templateUrl: "./slider.component.html",
  styleUrls: ["./slider.component.css"],
})
export class SliderComponent implements OnInit {
  constructor() {}

  active = true;

  @Output() changed = new EventEmitter<boolean>();

  ngOnInit(): void {}

  onToggle() {
    this.active = !this.active;
    this.changed.emit(this.active);
  }
}
