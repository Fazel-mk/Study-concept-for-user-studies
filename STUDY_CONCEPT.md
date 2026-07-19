# Group 12 Study Concept: Does Immediate Feedback Help Learning in a Math Tutoring System?

## 1. Setting of the study

For our study we use DromedaryITS, a web based intelligent tutoring system for
mathematics. Learners work through eight exercises that cover three topics:
arithmetic (addition, subtraction, multiplication and division), algebra (linear
and quadratic equations) and derivatives. Each exercise has three multiple
choice questions, so there are 24 questions in total. After a learner picks an
answer they submit it and move on to the next question, and worked example pages
are available if they want to review a topic.

We have adapted the system for the experiment. It now assigns each participant to
a group at random, can switch the per answer feedback on or off, shows a review
section when a learner struggles, and logs every answer so we can export the data
as a CSV file. The study runs online so participants can take part from their own
devices at https://fazel-mk.github.io/Study-concept-for-user-studies/.

## 2. Hypotheses

The main question we want to answer is whether giving learners immediate feedback
after each answer changes how well they do on the questions that follow.

Our primary hypothesis (H1) is that participants who receive immediate feedback
after each answer will get more questions right on their first attempt than
participants who receive no feedback. The null hypothesis (H0) is that there is no
difference between the two groups.

We also have a few secondary hypotheses:

* H2: The feedback group improves more over the course of the exercises than the
  no feedback group.
* H3: Right after getting a question wrong, learners in the feedback group are
  more likely to answer the next question correctly. This is the most direct test
  of whether feedback shapes the very next answer.
* H4: Within the feedback group, learners who see the review section after getting
  several answers wrong do better on the following exercise than similar learners
  who were not shown a review.
* H5: The effect of feedback is stronger on the harder topics such as derivatives
  and quadratics than on arithmetic, where most learners may already do well.

It is also possible that we find no effect, for example if the questions are easy
enough that both groups score near the top, or if learners without feedback simply
think harder before answering and close the gap.

## 3. Study design and method

We use a between subjects design with two conditions, and we assign participants
to them at random in roughly equal numbers. The feedback group (the intervention
group) is told straight away whether each answer was right or wrong, in the form
of a short encouraging message, together with pass or fail scoring and a review
section when too many answers are wrong. The no feedback group (the control
group) only sees a neutral message that their answer was recorded, with no
information about whether it was right or wrong at any point.

Learners in both groups can also skip a question instead of guessing, and we
record how far each participant got so we can see where people stopped.

We chose a between subjects design on purpose. If we had the same person do both
conditions, they could not unsee the feedback they were given, and the learning
from one condition would carry over into the other.

A session takes about 10 to 15 minutes and runs as follows. The participant opens
the study link in a fresh or private browser window and is assigned to a group
automatically, along with an anonymous participant id. After a short welcome and
instructions they work through the eight exercises in order, selecting an answer,
submitting it and moving on, with the feedback manipulation applied the whole way
through. When they finish, the answer log is exported as a CSV file that we
collect.

For every submitted answer we record the participant id, the group, the topic and
question, the attempt number, the option the learner chose, the correct option,
whether the answer was correct, whether it was a first attempt, the time since the
session started and a timestamp. We also log a marker each time an exercise is
completed and each time the review section is triggered. We do not collect names,
email addresses or any other personal information.

## 4. Analysis plan

Our main outcome measure is first attempt accuracy, meaning the share of questions
a participant gets right on their first try. We work this out per participant from
the rows that are marked as first attempts.

To start with we will describe the data by reporting the mean and standard
deviation for each group and showing them side by side as a bar chart with error
bars, which the built in dashboard already produces. To test H1 and H5 we will
compare first attempt accuracy between the groups with an independent samples t
test, or a Mann Whitney U test if the data is not normally distributed, both
overall and broken down by topic. For H2 we will look at accuracy across the order
of the exercises using a mixed ANOVA or a regression with an interaction between
exercise order and group. For H3 we will check how often a learner answers the
next question correctly depending on whether they got the previous one right, and
compare this between groups. For H4 we will use the review markers to compare how
the feedback group does on the exercise after a review. We will also report effect
sizes and confidence intervals and use the usual five percent significance level.

## 5. Additional information

The study is fully anonymous and taking part is voluntary. No personal data is
collected, and the answers stay in the participant's own browser until they export
the CSV file and share it with us. Because each browser counts as its own
participant, many people can take part at the same time from different devices.

For now the exercises are always shown in the same order. In a later version we
could randomise the order of the topics to rule out order effects. We will also
decide on a target number of participants per group based on a power analysis for
the effect size we expect.

There are some limitations worth noting. Arithmetic in particular may be easy
enough that both groups do well and any difference is hidden. The session is short,
the sample is a convenience sample, and people take part remotely without
supervision, so the testing conditions are not tightly controlled.

## 6. Additions after the presentation

After we presented the concept, Alina suggested four additions. We have now
built all of them into the study.

The first is tracking when and where people drop out. We record the last
question or exercise a participant reached, when they were last active and when
they leave the page. This lets us study how many people drop out and where, turns
drop out into an outcome in its own right (for example we can check whether the
lack of feedback makes people give up sooner), and warns us if drop out differs
between the groups in a way that could bias the results.

The second is Bayesian Knowledge Tracing. Instead of looking only at raw
accuracy, this models how much a learner actually knows about each skill based on
their sequence of right and wrong answers. It gives a finer measure of mastery and
of how much someone has learned, which would let us compare the two groups more
sensitively.

The third is giving richer feedback rather than only saying whether an answer was
right or wrong. The feedback group now sees encouraging and more detailed
messages such as "Very good, that's the right answer" or "Almost there, try
working through it once more", while the control group still sees nothing about
correctness. This is closer to how a real tutor responds, and it lets us look at
the effect of the kind of feedback and not only at whether feedback was given at
all.

The fourth is a skip button so learners can pass on a question instead of
being forced to guess. We log skips as their own type of response, which cuts
down on the noise that random guessing adds to the accuracy measure and lets us see
whether one group avoids questions more than the other.

## Note on AI use

We used Claude (Anthropic) as our AI tool in this project.
