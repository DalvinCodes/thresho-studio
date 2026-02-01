import { Card } from "../../components/common/Card";

const SHOT_LISTS = [
  { id: 1, name: "Q1 Campaign", completed: 4, total: 12, status: "active" },
  { id: 2, name: "Product Shoot", completed: 8, total: 8, status: "complete" },
  { id: 3, name: "Social Series", completed: 0, total: 6, status: "planned" },
];

export const ActiveShotLists = () => {
  return (
    <Card className="h-full">
      <h3 className="text-base font-semibold text-text mb-4">
        Active Shot Lists
      </h3>
      <div className="space-y-5">
        {SHOT_LISTS.map((list) => {
          const progress = Math.round((list.completed / list.total) * 100);
          const isComplete = list.completed === list.total;
          const isNotStarted = list.completed === 0;

          return (
            <div key={list.id}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-text">
                  {list.name}
                </span>
                <span className="text-xs text-text-muted tabular-nums">
                  {isComplete
                    ? `${list.completed}/${list.total} (100%)`
                    : isNotStarted
                      ? `${list.completed}/${list.total} (0%)`
                      : `${list.completed}/${list.total} (${progress}%)`}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-1 w-full bg-border rounded-full overflow-hidden">
                {isComplete ? (
                  <div className="h-full w-full bg-status-success rounded-full" />
                ) : list.completed > 0 ? (
                  <div
                    className="h-full bg-brand-orange rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                ) : null}
              </div>

              <div className="mt-1 text-xs">
                {isComplete ? (
                  <span className="text-status-success">Ready for export</span>
                ) : isNotStarted ? (
                  <span className="text-text-subtle">Not started</span>
                ) : (
                  <span className="text-text-muted"><span className="tabular-nums">{list.completed}</span> shots complete</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
