export class Bag<T> {
  contents: T[];

  constructor(contents?: T[]) {
    this.contents = contents ? contents.slice() : [];
  }

  add(element: T): void {
    this.contents.push(element);
  }

  remove(element: T): T | undefined {
    const index = this.contents.indexOf(element);
    if (index !== -1) {
      return this.contents.splice(index, 1)[0];
    }
    return undefined;
  }

  contains(element: T): boolean {
    return this.contents.indexOf(element) !== -1;
  }
}
