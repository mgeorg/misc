
num <- 1000
success_prob <- .9
expected_success_prob <- .9
a <- runif(num) < success_prob
successes <- sum(a)

beta(num-successes,successes)

successes
num
prob

x <- seq(0,1,by=.001)
y <- dbeta(x, num-successes, successes)
plot(x,y,type='l')

y <- pbeta(x, num-successes, successes)
plot(x,y,type='l')

y <- pbeta(x, 1, 2)
plot(x,y,type='l')

vals <- rep(NaN, 10000)
for (iter in 1:10000) {
  num <- 10000
  success_prob <- .9
  expected_success_prob <- .9
  a <- runif(num) <= success_prob
  successes <- sum(a)
  if (num-successes > 0) {
    c <- pbeta(1-expected_success_prob, num-successes, successes+1)
  } else {
    c <- 1
  }
  vals[iter] <- c
}
mean(vals)
p_val <- .001
sum(vals < p_val) / (length(vals) / (1/p_val))

num_iters <- 10000
confidence_threshold <- .001
aborted <- rep(FALSE, num_iters)
for (iter in 1:num_iters) {
  num <- 10000
  success_prob <- .99
  expected_success_prob <- .99
  outcomes <- runif(num) <= success_prob

  successes <- 0
  samples <- 0
  for (current_outcome in outcomes) {
    samples <- samples + 1
    if (current_outcome) {
      successes <- successes + 1
    } else {
      # p_val increases with failure, check whether it is high enough to abort.
      p_val <- pbeta(1-expected_success_prob, samples-successes, successes+1)
      if (p_val < confidence_threshold) {
        aborted[iter] <- TRUE
        break
      }
    }
  }
}
cat(sprintf("proportion aborted %g vs target of %g\n",
            mean(aborted), confidence_threshold))


