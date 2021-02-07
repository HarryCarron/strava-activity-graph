import { Component, Input, OnInit } from "@angular/core";

@Component({
  selector: "app-data-editor",
  templateUrl: "./data-editor.component.html",
  styleUrls: ["./data-editor.component.css"],
})
export class DataEditorComponent implements OnInit {
  constructor() {}

  @Input() isOpen: boolean;

  ngOnInit(): void {}
}
