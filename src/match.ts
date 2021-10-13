class Match {
  end_in_before: number;
  end_in_after: number;
  constructor(public start_in_before:number, public start_in_after:number, public length:number) {
    this.start_in_before = start_in_before;
    this.start_in_after = start_in_after;
    this.length = length;
    this.end_in_before = this.start_in_before + this.length - 1;
    this.end_in_after = this.start_in_after + this.length - 1;
  }
};

export default Match;